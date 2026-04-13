from pydantic import BaseModel
from typing import List, Optional, Annotated
from langgraph.graph.message import BaseMessage, add_messages
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from services import app_setting_service
from langchain_openai import ChatOpenAI
from langchain_core.messages import (
    SystemMessage,
    HumanMessage,
    ToolMessage,
    AIMessage,
    AIMessageChunk,
)
from langgraph.prebuilt import ToolNode, tools_condition
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from logging import Logger


def _mcp_tool_tag_set(tool) -> set[str]:
    """Tags from MCP tool meta (FastMCP 3.x uses 'fastmcp'; older uses '_fastmcp')."""
    meta = tool.meta or {}
    ns = meta.get("fastmcp") or meta.get("_fastmcp") or {}
    tags = ns.get("tags") or []
    return {str(t).lower() for t in tags}


def _tenant_tool_tag_filter(*parts: Optional[str]) -> set[str]:
    return {str(p).lower() for p in parts if p is not None and str(p).strip() != ""}


class AppointmentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_name: Optional[str] = None


async def create_appointment_graph(
    mcp_client: MCPClient, db: AsyncSession, tenant_id: int, log: Logger
) -> CompiledStateGraph:
    """
    Creates and returns a LangGraph StateGraph for appointment scheduling.
    """
    # menu_setting = await app_setting_service.get_app_setting_by_key_value(
    #     db=db, key="MENU", tenant_id=tenant_id
    # )
    business_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    )
    tag_filter = _tenant_tool_tag_filter("common", business_setting)
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
        if not tag_filter or _mcp_tool_tag_set(tool) & tag_filter
    ]
    log.info("Appointment Graph: tools added to workflow:")
    for t in tools:
        log.info(f"  - {getattr(t, 'name', getattr(t, '__name__', str(t)))}")

    def _tool_node_error(exc: Exception) -> str:
        log.exception("MCP tool failed: %s", exc)
        return (
            "Tool error: the ordering or database service failed. "
            f"Details: {exc}"
        )

    llm = ChatOpenAI(
        model_name="gpt-4o-mini",
        temperature=0,
        streaming=True,
    ).bind_tools(tools=tools)

    async def classify_intent(state: AppointmentState):
        log.info("User said: %s", state.user_input or "")
        # prompt = f"""
        # You are an inbound calling assistant. The business type is {business_setting or "clinic"}. The system includes core capabilities (schedule/reserve, reschedule, cancel) and may include additional custom capabilities defined in App Settings.
        # Your responsibilities:
        # Understand what the caller needs.
        # Collect any missing information conversationally and naturally (this is a voice call).
        # When all information is available, call the correct tool:
        # • schedule/reserve → scheduling tool
        # • reschedule → rescheduling tool
        # • cancel → cancellation tool

        # For custom capabilities (capabilities without a tool) or any factual/general questions about the business:
        # • Always call the retriever with the caller's query first.
        # • Use only the retrieved information to answer.
        # • Never answer factual/business questions from your own memory.
        # • Never call the same tool more than once for the same question.

        # If the caller wants to talk to a human, analyze the conversation and return a warm, apologetic message and end with **NEEDS_HUMAN_INTERVENTION**.
        # If the caller wants to end the call, analyze the conversation and return a polite call-ending message and end with **FINISH_CONVERSATION** only.

        # Conversation style:
        #     Keep responses brief, clear, and conversational.
        #     Ask for missing details naturally.
        #     Do not repeat information unless confirming an action.
        #     After completing any action, ask if they need anything else.
        # General rules:
        #     Do not invent or assume information.
        #     Do not rely on your own memory for factual details.
        #     Always use the retriever for factual/general questions and custom capabilities.
        #     Call tools only when all required details have been collected.
        #     if you don't find any information in the retriever, respond with "I'm sorry, I don't have that information right now."
        # ----------------------
        # {f"Custom capabilities: {menu_setting}" if menu_setting else ""}
        # ----------------
        # Remember: this is a phone call.
        # current date and time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
        # """

        prompt = f"""
        You are an inbound call assistant for a {business_setting or "clinic"}.

        CORE RULES:
        - Keep responses brief and conversational (this is a voice call)
        - Collect missing info one at a time naturally before calling tools
        - NEVER call the same tool twice for the same question
        - NEVER invent information. User messages is your only source of truth about the caller and their needs.
        - Always confirm details with the caller before taking any action
        - Always respond in English
        - After completing any action, ask if they need anything else

        For questions about the business OR custom capabilities (hours, location, policies, general FAQ):
        1. Call retriever with caller's query
        2. Answer ONLY from retrieved info
        3. If no info found: "I'm sorry, I don't have that information right now."

        MENU ITEM NAMES, PRICES, AND "WHAT DO YOU HAVE TO EAT":
        - Do NOT use the retriever or your own knowledge for the live menu. Those are wrong sources for dish lists.
        - If ordering tools include list_menu: you MUST call list_menu for any menu / dish / price question. The menu in the
          database is exactly what list_menu returns—nothing else is authoritative.

        ORDER TAKING (only if ordering tools like create_order, list_menu, add_order_item, confirm_order are available):
        MANDATORY — tools are the only way a real order exists:
        - You MUST NOT say you are "placing", "submitting", "setting up", or "getting that ready" unless you are issuing
          tool calls in this turn (create_order / add_order_item / confirm_order). Plain text is NOT an order in the system.
        - When the user has confirmed what to eat (item + quantity): (1) call list_menu if you do not already have
          menu_item_ids matching their items; (2) call create_order once (use customer_name from [Caller: ...] in the
          conversation if present—do NOT ask for their name again unless it is missing); (3) call add_order_item for each
          line with order_id, menu_item_id (the id before ":" in list_menu output), and quantity; (4) reply with a short
          spoken summary INCLUDING the order id from the tool result.
        - If their item is not on list_menu, say so and offer alternatives from list_menu—never invent menu items or prices.
        - Opening the flow: you may ask once whether they know what they want or want a short menu summary; then follow the
          mandatory tool steps above as soon as items are clear.
        - For voice, keep list_menu summaries short; offer more on request.
        - Before finalizing: recap; call confirm_order only after clear yes. Use cancel_order / line updates when they ask.
        - Prices and availability come only from ordering tools, not memory or retriever.
        - If user_input looks like garbled speech or off-topic during ordering, do NOT use the retriever; briefly ask them
          to repeat or steer back to the order.
        - "NEVER call the same tool twice for the same question" means no duplicate identical calls; calling list_menu
          again for a new category is fine.

        SPECIAL CASES:
        - If the caller wants to talk to a human, analyze the conversation and return a warm, apologetic message and end with **NEEDS_HUMAN_INTERVENTION**.
        - If the caller wants to end the call, analyze the conversation and return a polite call-ending message and end with **FINISH_CONVERSATION** only.

        Current time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
        """
        msg_in = ( 
            [
                message
                for message in state.messages
                if isinstance(message, (HumanMessage, ToolMessage, AIMessage))
            ]
            + [
                SystemMessage(content=prompt),
                HumanMessage(content=f"User just said: {state.user_input}"),
            ]
        )
        # Stream tokens so LangGraph can emit AIMessageChunk early (faster TTS start).
        gathered: AIMessageChunk | None = None
        # Stream tokens immediately back to the graph as they are generated.
        gathered: AIMessageChunk | None = None
        async for chunk in llm.astream(msg_in):
            # Immediately yield or return each chunk as a partial message.
            partial_content = chunk.content if hasattr(chunk, "content") else None
            partial_tool_calls = getattr(chunk, "tool_calls", None) or []
            response_partial = AIMessage(
                content=partial_content,
                tool_calls=list(partial_tool_calls),
                id=getattr(chunk, "id", None),
                usage_metadata=getattr(chunk, "usage_metadata", None),
                response_metadata=getattr(chunk, "response_metadata", None),
            )
            # Log the partial as it's streamed, if useful
            content = getattr(response_partial, "content", None) or ""
            tool_calls = getattr(response_partial, "tool_calls", None) or []
            if tool_calls:
                log.info("Assistant streaming tool_calls: %s | text: %s", tool_calls, content)
            else:
                log.info("Assistant streaming: %s", content)
            # Immediately yield as a streamed message (Graph streaming API must support this)
            yield {"messages": [response_partial]}
            # Gather up full for final return if caller expects it
            gathered = chunk if gathered is None else gathered + chunk

        # Also return the final completed response for possible postprocessing
        if gathered is None:
            response = AIMessage(content="")
        else:
            tc = getattr(gathered, "tool_calls", None) or []
            response = AIMessage(
                content=gathered.content,
                tool_calls=list(tc),
                id=gathered.id,
                usage_metadata=getattr(gathered, "usage_metadata", None),
                response_metadata=getattr(gathered, "response_metadata", None),
            )
        content = getattr(response, "content", None) or ""
        tool_calls = getattr(response, "tool_calls", None) or []
        if tool_calls:
            log.info("Assistant tool_calls: %s | text: %s", tool_calls, content)
        else:
            log.info("Assistant: %s", content)
        yield {"messages": [response]}

    workflow = StateGraph(AppointmentState)
    workflow.add_node("classify_intent", classify_intent)
    workflow.add_node(
        "tools", ToolNode(tools=tools, handle_tool_errors=_tool_node_error)
    )

    workflow.set_entry_point("classify_intent")
    workflow.add_conditional_edges(
        "classify_intent", tools_condition, {"tools": "tools", END: "log"}
    )
    workflow.add_edge("tools", "classify_intent")
    workflow.add_node("log", lambda s: print(s))
    workflow.add_edge("log", END)
    return workflow.compile()
