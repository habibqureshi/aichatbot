from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from langgraph.prebuilt import ToolNode, tools_condition
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)
from datetime import datetime, timezone
from logging import Logger
from typing import Optional

from aimodels.llm import llm
from graph.constants import BookingStatus, IntentGraphState


def _mcp_tool_tag_set(tool) -> set[str]:
    meta = tool.meta or {}
    ns = meta.get("fastmcp") or meta.get("_fastmcp") or {}
    tags = ns.get("tags") or []
    return {str(t).lower() for t in tags}


def _tenant_tool_tag_filter(*parts: Optional[str]) -> set[str]:
    return {str(p).lower() for p in parts if p is not None and str(p).strip() != ""}


async def get_appointment_graph(
    mcp_client: MCPClient, log: Logger
) -> CompiledStateGraph:
    """
    Creates and returns a LangGraph StateGraph for appointment scheduling.
    """
    # business_setting = await app_setting_service.get_app_setting_by_key_value(
    #     db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    # )
    tag_filter = _tenant_tool_tag_filter("common", "appointment_tool")
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
        if not tag_filter or _mcp_tool_tag_set(tool) & tag_filter
    ]

    # Bind MCP tools to the LLM for tool calling inside this sub-graph
    llm_with_tools = llm.bind_tools(tools=tools)

    # Log tools that will be available inside the appointment graph
    log.info("Appointment Graph: tools added to workflow:")
    for t in tools:
        log.info(f"  - {getattr(t, 'name', getattr(t, '__name__', str(t)))}")

    def appointment_agent(state: IntentGraphState):
        prompt = f"""
            Your job is to book, cancel, and update reservations quickly and accurately.

            ## Caller Info
            - Customer Name: {state.customer_name}
            - Customer Phone: {state.customer_phone}
            - Current date/time (UTC): {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}

            ## Your Responsibilities
            - Book, cancel, and update reservations using the provided tools.
            - Always confirm full details with the caller BEFORE finalizing.

            ## Booking Flow
            1. Ask for: csutomer name , date, time, party size, and any special requests (if not provided).
            2. Confirm details with the caller:
            "Just to confirm — [Customer Name], party of [X], on [date] at [time]. Shall I go ahead?"
            3. Only book after the caller confirms.
            5. If unavailable → suggest different time slot.

            ## Rules
            - Be concise — no unnecessary filler or long explanations.
            - Never book, cancel, or update without explicit caller confirmation.
            - If information is missing, ask for one thing at a time.
            - Always provide a reservation/confirmation number after booking.
            - Dont assume anything from your side.

            ## Tone
            Direct, polite, and efficient. Keep responses short as much as possible.
            """
        response = llm_with_tools.invoke(
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
        # response is a list of messages
        confirmed = False

        for msg in response:
            print("msg", msg)
            # Check if it's a ToolMessage and contains "Reservation confirmed" (substring)
            if isinstance(msg, ToolMessage) and "Reservation confirmed" in getattr(
                msg, "content", ""
            ):
                confirmed = True
                break
        return {
            "messages": [response],
            "booking_status": (
                BookingStatus.CONFIRMED if confirmed else BookingStatus.NOT_CONFIRMED
            ),
            "next_agent": None if confirmed else state.next_agent,
        }

    workflow = StateGraph(IntentGraphState)
    workflow.add_node("appointment", appointment_agent)
    workflow.add_node("tools", ToolNode(tools=tools))

    workflow.set_entry_point("appointment")
    workflow.add_conditional_edges(
        "appointment", tools_condition, {"tools": "tools", END: "log"}
    )
    workflow.add_edge("tools", "appointment")
    workflow.add_node("log", lambda s: print(s))
    checkpointer = InMemorySaver()
    return workflow.compile(checkpointer=checkpointer)
