"""
LangGraph for phone order-taking (restaurant / ordering MCP tools).
Uses customer_* fields in state; logic mirrors appointmnet_graph ordering rules.
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
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from logging import Logger

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:  # pragma: no cover
    _get_stream_writer = None  # type: ignore[misc, assignment]


MCP_WRAPPED_STREAM_TOOLS = frozenset({"create_order", "list_menu"})


def _emit_order_mcp_tool_stream(payload: dict[str, Any], log: Logger) -> None:
    """Emit LangGraph custom stream chunks when supported; always log for app.log visibility."""
    sw_status = "skipped"
    if _get_stream_writer is not None:
        try:
            writer = _get_stream_writer()
            if writer is not None:
                writer({"type": "order_mcp_tool", **payload})
                sw_status = "ok"
            else:
                sw_status = "no_op_writer"
        except Exception as e:
            sw_status = f"exc:{type(e).__name__}"
    else:
        sw_status = "import_missing"
    log.info(
        "ORDER_MCP_TOOL_PROGRESS | tool=%s phase=%s stream_writer=%s",
        payload.get("tool"),
        payload.get("phase"),
        sw_status,
    )
    if payload.get("phase") == "error" and payload.get("error"):
        log.info("ORDER_MCP_TOOL_PROGRESS | error_detail=%s", payload.get("error"))


def _mcp_tool_result_str(result: Any) -> str:
    if result is None:
        return ""
    if getattr(result, "isError", None) or getattr(result, "is_error", False):
        return f"Tool error: {result}"
    texts: list[str] = []
    for block in getattr(result, "content", None) or []:
        t = getattr(block, "text", None)
        if t is not None:
            texts.append(str(t))
        elif isinstance(block, dict):
            tx = block.get("text")
            if tx:
                texts.append(str(tx))
    out = "".join(texts).strip()
    return out if out else str(result)


def _build_stream_wrapped_mcp_tools(session: Any, log: Logger) -> dict[str, Any]:
    """LangChain tools that forward to MCP and emit stream_writer-style custom events."""

    @tool
    async def create_order(
        customer_name: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """Create a new draft order for the caller.

        Args:
            customer_name: Optional display name for the customer (not the phone number).
            notes: Optional free-text notes for the order.
        """
        _emit_order_mcp_tool_stream({"tool": "create_order", "phase": "start"}, log)
        try:
            args: dict[str, Any] = {}
            if customer_name is not None and str(customer_name).strip():
                args["customer_name"] = customer_name
            if notes is not None and str(notes).strip():
                args["notes"] = notes
            res = await session.call_tool("create_order", args)
            text = _mcp_tool_result_str(res)
            _emit_order_mcp_tool_stream({"tool": "create_order", "phase": "done"}, log)
            return text
        except Exception as e:
            log.exception("Wrapped create_order MCP call failed: %s", e)
            _emit_order_mcp_tool_stream(
                {"tool": "create_order", "phase": "error", "error": str(e)},
                log,
            )
            raise

    @tool
    async def list_menu(
        category: Optional[str] = None,
        limit: int = 20,
    ) -> str:
        """List available menu items (id, name, price).

        Args:
            category: Optional category filter.
            limit: Max rows to return.
        """
        _emit_order_mcp_tool_stream({"tool": "list_menu", "phase": "start"}, log)
        try:
            args: dict[str, Any] = {"limit": int(limit)}
            if category is not None and str(category).strip():
                args["category"] = category
            res = await session.call_tool("list_menu", args)
            text = _mcp_tool_result_str(res)
            _emit_order_mcp_tool_stream({"tool": "list_menu", "phase": "done"}, log)
            return text
        except Exception as e:
            log.exception("Wrapped list_menu MCP call failed: %s", e)
            _emit_order_mcp_tool_stream(
                {"tool": "list_menu", "phase": "error", "error": str(e)},
                log,
            )
            raise

    return {"create_order": create_order, "list_menu": list_menu}


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


async def create_order_graph(
    mcp_client: MCPClient, db: AsyncSession, tenant_id: int, log: Logger
) -> CompiledStateGraph:
    business_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    )
    tag_filter = _tenant_tool_tag_filter("common", business_setting)
    wrapped = _build_stream_wrapped_mcp_tools(mcp_client.session, log)
    tools = []
    for mcp_tool in await mcp_client.client.list_tools():
        if tag_filter and not (_mcp_tool_tag_set(mcp_tool) & tag_filter):
            continue
        name = getattr(mcp_tool, "name", None) or ""
        if name in MCP_WRAPPED_STREAM_TOOLS and name in wrapped:
            tools.append(wrapped[name])
        else:
            tools.append(
                convert_mcp_tool_to_langchain_tool(
                    session=mcp_client.session, tool=mcp_tool
                )
            )
    log.info("Order Graph: tools added to workflow:")
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

    async def classify_intent(state: OrderState):
        log.info("User said: %s", state.user_input or "")
        prompt = f"""
        You are an inbound call assistant for a {business_setting or "restaurant"} (phone orders).

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
        gathered: AIMessageChunk | None = None
        async for chunk in llm.astream(msg_in):
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
        return {"messages": [response]}

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
    return workflow.compile()
