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
from pydantic import BaseModel
from typing import Annotated, Any, List, Optional
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
        log.info("Order graph: MCP not connected; using local order + retriever tools only.")

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
    _system_prompt = (
        f"You are a brief, conversational phone assistant for a {biz}.\n"
        "RULES:\n"
        "- Be short (this is a voice call). Collect missing info one at a time.\n"
        "- Never invent info; user messages are your only truth.\n"
        "- Confirm details before acting. After any action, ask if they need more.\n"
        "- Respond in English only.\n"
        "\n"
        "SERVICES:\n"
        "- You provide two services: (1) order taking, (2) table reservation for dine-in.\n"
        "- First identify what the caller wants. If unclear, ask: \"Would you like to place an order or reserve a table?\"\n"
        "\n"
        "BUSINESS / FAQ:\n"
        "- Use knowledge_retriever for hours, location, policies. Answer only from results.\n"
        "- If nothing found: \"I'm sorry, I don't have that information right now.\"\n"
        "\n"
        "MENU:\n"
        "- ALWAYS call list_menu for any menu/dish/price question — never guess.\n"
        "- Do NOT use knowledge_retriever or your own knowledge for menu items.\n"
        "\n"
        "ORDERING:\n"
        "- Tools are the only way an order exists. Never say you're placing an order without issuing tool calls.\n"
        "- Flow: list_menu (get ids) → create_order (once, use caller name if known) → add_order_item per line → spoken summary with order id.\n"
        "- Unavailable items: say so and offer alternatives from list_menu.\n"
        "- Keep menu summaries short for voice; offer more on request.\n"
        "- Recap before confirming. Use cancel_order / update / remove when asked.\n"
        "- Prices come only from tools.\n"
        "- Garbled or off-topic speech during ordering: ask to repeat, don't use retriever.\n"
        "- No duplicate identical tool calls; new category = new list_menu is fine.\n"
        "\n"
        "TABLE RESERVATION:\n"
        "- Use check_table_availability before finalizing a reservation request when date/time or party size changes.\n"
        "- If the caller mentions a seating/location preference such as rooftop, indoor, patio, window, or outdoor, pass it in `location_preference`.\n"
        "- Use reserve_table to create a reservation once date, time, party size, location preference, and caller details are clear.\n"
        "- Use update_reservation when caller changes date/time/party size/location/special request.\n"
        "- Use cancel_reservation when caller asks to cancel.\n"
        "- Never use ordering tools for reservation-only requests.\n"
        "- If the caller switches from reservation to ordering (or wants both), handle each intent accordingly.\n"
        "\n"
        "SPECIAL:\n"
        "- Caller wants a human → apologetic message ending with **NEEDS_HUMAN_INTERVENTION**\n"
        "- Caller wants to end call → polite goodbye ending with **FINISH_CONVERSATION**"
    )

    llm = ChatOpenAI(
        model_name="gpt-5.4",
        temperature=0,
        streaming=True,
    ).bind_tools(tools=tools)

    async def classify_intent(state: OrderState):
        log.info("User said: %s", state.user_input or "")
        log.info(f"state messages: {state.messages}")

        has_system = state.system_prompt_injected or any(
            isinstance(m, SystemMessage) for m in state.messages
        )

        msg_in = []
        if not has_system:
            msg_in.append(SystemMessage(content=_system_prompt))

        for message in state.messages:
            if isinstance(message, (HumanMessage, ToolMessage, AIMessage, SystemMessage)):
                msg_in.append(message)

        now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        msg_in.append(
            HumanMessage(content=f"[Time: {now_str}] User just said: {state.user_input}")
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
                        first_delta if len(first_delta) <= 300 else (first_delta[:300] + "..."),
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
    return workflow.compile(checkpointer=InMemorySaver())
