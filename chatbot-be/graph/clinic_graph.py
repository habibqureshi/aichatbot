"""
LangGraph for clinic receptionist phone support.

Handles:
1) Appointment booking, rescheduling, and cancellation (MCP tools)
2) General clinic queries — hours, location, doctors, services (retriever)

Mirrors the order_graph architecture:
- InMemorySaver checkpointer for per-thread memory
- system_prompt_injected flag to avoid duplicate system messages
- First-chunk logging for latency visibility
- MCP tool tag filtering by tenant
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
from langchain_mcp_adapters.tools import convert_mcp_tool_to_langchain_tool
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from logging import Logger
from langgraph.checkpoint.memory import InMemorySaver
from tools.clinic_tools import build_clinic_tools
from tools.retriever_tools import build_retriever_tools


def _mcp_tool_tag_set(tool) -> set[str]:
    meta = tool.meta or {}
    ns = meta.get("fastmcp") or meta.get("_fastmcp") or {}
    tags = ns.get("tags") or []
    return {str(t).lower() for t in tags}


def _tenant_tool_tag_filter(*parts: Optional[str]) -> set[str]:
    return {str(p).lower() for p in parts if p is not None and str(p).strip() != ""}


class ClinicState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    system_prompt_injected: bool = False


memory = InMemorySaver()


async def create_clinic_graph(
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

    clinic_tools = build_clinic_tools(
        db=db,
        tenant_id=tenant_id,
        log=log,
        customer_phone=customer_phone,
        customer_name=customer_name,
        call_sid=call_sid,
    )
    retriever_tools = build_retriever_tools(tenant_id=tenant_id, log=log)
    tools = list(clinic_tools) + list(retriever_tools)

    log.info("Clinic Graph: tools added to workflow:")
    for t in tools:
        log.info(f"  - {getattr(t, 'name', getattr(t, '__name__', str(t)))}")

    def _tool_node_error(exc: Exception) -> str:
        log.exception("Tool execution failed: %s", exc)
        return f"Tool error: the clinic service failed. Details: {exc}"

    biz = business_setting or "clinic"
    system_prompt = (
        f"You are a polite, professional phone assistant for a {biz}. Reply in English only.\n"
        "=== CRITICAL FORMATTING RULES (NEVER VIOLATE) ===\n"
        "1. Do NOT emphasize any word, date, time, or phrase for readability or aesthetics. All words must have identical formatting weight."
        "2. Do not use bullets, numbered lists, labels, headings, or line prefixes.\n"
        "3. Keep replies extremely short: default 1 line, max 2 short lines.\n\n"
        "Collect missing info one thing at a time. Do not invent facts.\n"
        "Before any tool call, check prior ToolMessages in state; reuse if still valid. Do not repeat identical tool calls.\n"
        "\n"
        "GENERAL QUERIES (hours, location, services, doctors, policies, fees):\n"
        "- Always call knowledge_retriever first.\n"
        "- Answer only from tool output.\n"
        "- If not found: \"I'm sorry, I don't have that information right now.\"\n"
        "\n"
        "VOICE & EMOTION:\n"
        "- Speak like a polite, calm human, not a robot.\n"
        '- DEFAULT tone: <emotion value="anxious"/> — warm and composed.\n'
        '- Complaints / issues → <emotion value="affectionate"/>\n'
        '- Good news / confirmations → <emotion value="happy"/>\n'
        '- Not understanding / errors → <emotion value="apologetic"/>\n'
        "- Never stack multiple emotion tags. Each tag is self-closing.\n"
        "- Never place emotion tags in the middle or end of a sentence.\n"
        "\n"
        "Caller wants a human: warm apologetic message ending with **NEEDS_HUMAN_INTERVENTION**.\n"
        "Caller wants to end: polite goodbye ending with **FINISH_CONVERSATION**."
    )

    llm = ChatOpenAI(
        model_name="gpt-4o-mini",
        temperature=0,
        streaming=True,
    ).bind_tools(tools=tools)

    async def classify_intent(state: ClinicState):
        log.info("User said: %s", state.user_input or "")

        has_system = state.system_prompt_injected or any(
            isinstance(m, SystemMessage) for m in state.messages
        )

        msg_in: list = []
        if not has_system:
            msg_in.append(SystemMessage(content=system_prompt))
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

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        current_day = datetime.now(timezone.utc).strftime("%A")
        msg_in.append(SystemMessage(content=f"""[Current Time: {now_str}] 
                [Current Day: {current_day}]"""))

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
                        "clinic | first_llm_chunk | chars=%d | text=%r",
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
            log.info("Clinic assistant tool_calls: %s | text: %s", tool_calls, content)
        else:
            log.info("Clinic assistant: %s", content)

        result: dict[str, Any] = {"messages": [response]}
        if not has_system:
            result["system_prompt_injected"] = True
        return result

    workflow = StateGraph(ClinicState)
    workflow.add_node("classify_intent", classify_intent)
    workflow.add_node(
        "tools", ToolNode(tools=tools, handle_tool_errors=_tool_node_error)
    )

    workflow.set_entry_point("classify_intent")
    workflow.add_conditional_edges(
        "classify_intent", tools_condition, {"tools": "tools", END: "log"}
    )
    workflow.add_edge("tools", "classify_intent")
    workflow.add_node("log", lambda s: log.info(s))
    workflow.add_edge("log", END)
    return workflow.compile(checkpointer=memory)
