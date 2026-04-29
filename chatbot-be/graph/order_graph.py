"""
LangGraph for restaurant phone support.
Supports two services:
1) order taking (tool-backed),
2) table reservation (tool-backed).
Uses customer_* fields in state; logic mirrors appointmnet_graph ordering rules.
Order tools and knowledge_retriever run directly against the local DB / ChromaDB
(no MCP round-trip) and emit stream_writer progress events.  Any remaining MCP
tools that match the tenant tag filter are still loaded from the MCP server.
"""

import re
from pydantic import BaseModel
from typing import Annotated, Any, List, Optional
from langgraph.graph.message import BaseMessage, add_messages
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from services import app_setting_service
from services import order_tool_service
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
from langgraph.checkpoint.memory import InMemorySaver
from tools.order_tools import build_order_tools
from tools.reservation_tools import build_reservation_tools
from tools.retriever_tools import build_retriever_tools


def _mcp_tool_tag_set(tool) -> set[str]:
    meta = tool.meta or {}
    ns = meta.get("fastmcp") or meta.get("_fastmcp") or {}
    tags = ns.get("tags") or []
    return {str(t).lower() for t in tags}


def _tenant_tool_tag_filter(*parts: Optional[str]) -> set[str]:
    return {str(p).lower() for p in parts if p is not None and str(p).strip() != ""}


class OrderState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    system_prompt_injected: bool = False
    current_order_id: Optional[int] = None


memory = InMemorySaver()


async def create_order_graph(
    mcp_client: MCPClient | None,
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    *,
    customer_phone: str | None = None,
    customer_name: str | None = None,
    call_sid: str | None = None,
) -> CompiledStateGraph:
    business_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    )
    menu_snapshot = await order_tool_service.get_menu_context_for_prompt(
        db=db, tenant_id=tenant_id
    )
    print(menu_snapshot)

    local_order_tools = build_order_tools(
        db=db,
        tenant_id=tenant_id,
        log=log,
        customer_phone=customer_phone,
        customer_name=customer_name,
        call_sid=call_sid,
    )
    local_reservation_tools = build_reservation_tools(
        db=db,
        tenant_id=tenant_id,
        log=log,
        customer_phone=customer_phone,
        customer_name=customer_name,
    )
    local_retriever_tools = build_retriever_tools(tenant_id=tenant_id, log=log)
    local_tools = (
        list(local_order_tools)
        + list(local_reservation_tools)
        + list(local_retriever_tools)
    )
    local_tool_names = {
        getattr(t, "name", getattr(t, "__name__", "")) for t in local_tools
    }

    tag_filter = _tenant_tool_tag_filter("common", business_setting)
    mcp_tools: list = []
    if mcp_client is not None and getattr(mcp_client, "connected", False):
        try:
            for mcp_tool in await mcp_client.client.list_tools():
                if tag_filter and not (_mcp_tool_tag_set(mcp_tool) & tag_filter):
                    continue
                name = getattr(mcp_tool, "name", None) or ""
                if name in local_tool_names:
                    continue
                mcp_tools.append(
                    convert_mcp_tool_to_langchain_tool(
                        session=mcp_client.session, tool=mcp_tool
                    )
                )
        except Exception as e:
            log.warning(
                "Order graph: could not load extra MCP tools (local tools still work): %s",
                e,
            )
    else:
        log.info(
            "Order graph: MCP not connected; using local order + retriever tools only."
        )

    tools = local_tools + mcp_tools

    log.info("Order Graph: tools added to workflow:")
    for t in tools:
        log.info(f"  - {getattr(t, 'name', getattr(t, '__name__', str(t)))}")

    def _tool_node_error(exc: Exception) -> str:
        log.exception("Tool execution failed: %s", exc)
        return (
            "Tool error: the ordering/reservation or database service failed. "
            f"Details: {exc}"
        )

    biz = business_setting or "restaurant"
    NEW_PROMPT = f"""
    You are a polite, professional phone assistant for a restaurant ({biz}).
    Tone:
    - Friendly but professional
    - Short and clear responses
    - No long explanations
    - No numbering in speech
    - Speak naturally

    Behavior:
    - Guide the user through ordering
    - Suggest add-ons briefly (upsell)
    - Confirm orders clearly
    - Handle mistakes politely
    - Never read numbers as list indices
    - Do not include numbering like 1, 2, 3 in lists
    - Always express prices in natural language (e.g., "2 dollars and 99 cents")
    - Never speak abbreviations as letters.
    - Always expand abbreviations into full natural words.


    Style:
    - Use simple sentences
    - Avoid filler words
    - Avoid robotic or overly enthusiastic tone
    CORE BEHAVIOR:
    * Never invent information.
    * If something is unavailable: briefly apologize and offer an alternative.
    * If you don’t know something: "I'm sorry, I don't have that information right now."
    * Use context to understand the conversation flow
    Example Flow

    User: I want a zinger burger
    Agent: “Got it. Would you like to make it a combo with fries and a drink?”

    User: yes
    Agent: “Great. Which drink would you like?”

    User: coke
    Agent: “Perfect. Your total is 5 dollars and 50 cents. Anything else?”

    MENU:
    ----------
    {menu_snapshot}
    ----------
    * Use this for user queries about menu.
    * DO NOT use knowledge_retriever for menu.
    * Do not repeat whole menu. if user ask for complete menu, just say 2-3 categories name to chose from.
    * The menu items are single serving items.
    * Give exact item name

    ORDERS:
    * Use tools to create and manage orders.
    * Create the order once, then add item as the user confirms.
    * Only add items confirmed by customer.
    * After completion, give a short recap with order ID.
    * Use tool data (prices, availability) as the source of truth.
    * only one order at a time.

    RESERVATIONS:
    * Use tools to create, update, or cancel reservations.
    * Check availability before confirming when date, time, or party size is involved.
    * Keep confirmations short and clear.
    * Include seating preference if mentioned.

    TOOLS:
    * Before calling a tool, check if the data already exists; avoid duplicate calls.
    * Confim action from user explicitly for tools that requires user_confirmation.
    * Never call multiple tools in a single turn if confirmation is required between them.
    * If the user confirms multiple order items together, call add_order_item once using item_name as [{{name, quantity}}, ...].
    * Avoid retrying add_order_item with the same items after a partial success; first check latest tool results in state.
    * Answer strictly from tool results when using it.


    VOICE TAGS (STRICT FORMAT):
    * Emotion tag MUST be the very first thing in the response.
    * Tag must be self-closing and used at most once per response.
    * Allowed values for emotion tag: ["happy","affectionate","apologetic","anxios"]
    * Default: anxios.

    * Use:
    * Complaints/issues → <emotion value="affectionate"/>
    * Good news/confirmations → <emotion value="happy"/>
    * Not understanding / errors → <emotion value="apologetic"/>

    * Never place emotion tags in the middle or end of a sentence.
    * Never stack multiple emotion tags.

    ENDING:
    * If the caller wants a human → end with **NEEDS_HUMAN_INTERVENTION**
    * If the caller ends the conversation → polite goodbye + **FINISH_CONVERSATION**
    """
    _system_prompt = (
        f"You are a concise phone assistant for a {biz}. Reply in English only.\n"
        "Keep replies extremely short: default 1 line, max 2 short lines.\n"
        "Collect missing info one thing at a time. Do not invent facts.\n"
        "Before any tool call, check prior ToolMessages in state; reuse if still valid. Do not repeat identical tool calls.\n"
        "Services: order taking and dine-in table reservations. If intent is unclear ask: "
        '"Would you like to place an order or reserve a table?"\n'
        "Use knowledge_retriever only for hours/location/policies; answer only from tool output. "
        "If missing: \"I'm sorry, I don't have that information right now.\"\n"
        "Silence handling is system-managed: if caller is silent for 5+ seconds, a keep-alive prompt is played; "
        "if still silent after two prompts, the call is ended.\n"
        "Menu: prefer cached snapshot for normal menu/category questions; use list_menu only for fresh, deep, or exact-price data. "
        "Give categories first, not full menu. Mention prices only when asked. Never use retriever for menu items.\n"
        f"Cached menu snapshot: {menu_snapshot}\n"
        "Ordering: tools are required to create/change orders. "
        "Flow: get_customer_profile -> (if needed update_customer_profile) -> create_order once -> add_order_item per item -> short recap with order id. "
        "If caller asks for last/current order or reservations without ids, call get_my_latest_order_and_reservations. "
        "Use tool prices only. If item unavailable, say so and suggest alternatives.\n"
        "Reservations: check_table_availability before finalizing when date/time/party changes. "
        "Use reserve_table to create, update_reservation to modify, cancel_reservation to cancel. "
        "Include seating preference in location_preference when mentioned.\n"
        "VOICE & EMOTION:\n"
        "- Speak like a polite human, not a robot.\n"
        '- DEFAULT tone: <emotion value="anxious"/> with calm pacing.\n'
        '- Complaints / issues -> <emotion value="affectionate"/> and slightly slower <speed ratio="0.9"/>\n'
        '- Good news / confirmations -> <emotion value="happy"/>\n'
        '- Urgent or time-sensitive -> slightly faster <speed ratio="1.1"/>\n'
        "- Asking for info -> neutral/friendly tone, no overacting.\n"
        '- Not understanding -> <emotion value="apologetic"/>\n'
        "- Never stack multiple emotion tags unnecessarily.\n"
        "- The tags will be self closing.\n"
        "Caller wants human: end with **NEEDS_HUMAN_INTERVENTION**. "
        "Caller wants to end: polite goodbye ending with **FINISH_CONVERSATION**."
    )

    llm = ChatOpenAI(
        model_name="gpt-4o-mini",
        temperature=0,
        streaming=True,
    ).bind_tools(tools=tools)

    async def classify_intent(state: OrderState):
        log.info("User said: %s", state.user_input or "")
        log.warning(f"state messages: {state.messages}")

        has_system = state.system_prompt_injected or any(
            isinstance(m, SystemMessage) for m in state.messages
        )

        msg_in = []
        if not has_system:
            msg_in.append(SystemMessage(content=NEW_PROMPT))
        if state.customer_phone:
            msg_in.append(
                HumanMessage(content=f"[Caller phone: {state.customer_phone}]")
            )
        if state.customer_name:
            msg_in.append(HumanMessage(content=f"[Caller: {state.customer_name}]"))

        for message in state.messages:
            if isinstance(
                message, (HumanMessage, ToolMessage, AIMessage, SystemMessage)
            ):
                msg_in.append(message)

        # if state.current_order_id is not None:
        #     msg_in.append(
        #         SystemMessage(
        #             content=f"Active order ID for this call: {state.current_order_id}."
        #         )
        #     )

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        msg_in.append(
            HumanMessage(
                content=f"[Time: {now_str}] User just said: {state.user_input}"
            )
        )

        gathered: AIMessageChunk | None = None
        first_chunk_logged = False
        async for chunk in llm.astream(msg_in):
            if not first_chunk_logged:
                c = getattr(chunk, "content", None)
                if isinstance(c, str):
                    first_delta = c
                elif isinstance(c, list):
                    parts: list[str] = []
                    for part in c:
                        if isinstance(part, dict) and part.get("type") == "text":
                            parts.append(str(part.get("text", "")))
                        elif isinstance(part, str):
                            parts.append(part)
                    first_delta = "".join(parts)
                elif c is None:
                    first_delta = ""
                else:
                    first_delta = str(c)
                if first_delta.strip():
                    log.info(
                        "yolo1 | first_llm_chunk | chars=%d | text=%r",
                        len(first_delta),
                        (
                            first_delta
                            if len(first_delta) <= 300
                            else (first_delta[:300] + "...")
                        ),
                    )
                    first_chunk_logged = True
            gathered = chunk if gathered is None else gathered + chunk

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

        result: dict[str, Any] = {"messages": [response]}
        if not has_system:
            result["system_prompt_injected"] = True
        return result

    workflow = StateGraph(OrderState)
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
    return workflow.compile(checkpointer=memory)
