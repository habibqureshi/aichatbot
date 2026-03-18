from logging import Logger
from typing import Annotated, Optional
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph, add_messages
from langgraph.types import Command, interrupt
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from openai import BaseModel
from aimodels.llm import llm, small_llm
from graph.constants import GraphNode, IntentGraphState
from utils.mcp_client import MCPClient
from configs import MCP_URL
from nodes.book_appointment_nodes import get_appointment_graph


class RouterOutput(BaseModel):
    next_agent: GraphNode
    model_config = {"extra": "forbid"}


def supervisor_node(state: IntentGraphState) -> Command:
    # If we're already mid-conversation with a sub-graph, skip re-classification
    # and route directly to that agent (e.g. user is answering follow-up questions)
    print("supervisor_node", state.next_agent)
    if state.next_agent and state.next_agent not in (GraphNode.UNSUPPORTED, None):
        print(
            f"supervisor_node: resuming existing conversation with {state.next_agent}"
        )
        return Command(
            goto=state.next_agent,
            update={
                "user_input": state.user_input,
            },
        )

    system_msg = SystemMessage(
        f"""You are an intent classifier.
            Classify the user's message into ONE of these intents:
            ReservationAgent
            FaqAgent
            Rules:
            - "ReservationAgent": user wants to schedule or make a new appointment
            - "ReservationAgent": user wants to cancel an existing appointment
            - "ReservationAgent": user wants to reschedule, modify, or change an appointment
            - "FaqAgent": user is asking for information about the restaurant such as menu, location, opening hours, or seating options (indoor/outdoor).
            - "unsupported": message does not match any intent or is unclear            
        Return ONLY defined structured output ."""
    )
    user_msg = HumanMessage(content=state.user_input)
    resp = small_llm.with_structured_output(RouterOutput).invoke(
        [system_msg, user_msg], config={"tags": ["nostream"]}
    )
    print("supervisor_node", resp)
    return Command(
        goto=resp.next_agent,
        update={
            "user_input": state.user_input,
            "next_agent": resp.next_agent,
        },
    )


def unsupported() -> Command:
    print("unsupported")


compiled_graph = None


async def voice_ai_graph(log: Logger):
    global compiled_graph
    if compiled_graph is not None:
        return compiled_graph

    checkpointer = InMemorySaver()
    mcp_client = MCPClient()
    success = await mcp_client.connect(
        url=MCP_URL,
        headers={
            "x-call-id": "1231231231231",
            "x-patient-no": "+923134033378",
            "x-tenant-id": "1",
            # Add headers if needed
        },
    )
    if not success:
        raise ConnectionError("Error during setup. Contact administrator!", success)
    appointmentGraph = await get_appointment_graph(mcp_client, log)
    workflow = StateGraph(IntentGraphState)
    workflow.add_node("classify_intent", supervisor_node)
    workflow.add_node("ReservationAgent", appointmentGraph)
    workflow.set_entry_point("classify_intent")
    workflow.add_edge("ReservationAgent", END)
    compiled_graph = workflow.compile(checkpointer=checkpointer)
    return compiled_graph
