from pydantic import BaseModel
from typing import List, Optional, Annotated
from langgraph.graph.message import BaseMessage, add_messages
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from langgraph.prebuilt import ToolNode, tools_condition
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)


class AppointmentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    patient_phone: Optional[str] = None


async def create_appointment_graph(mcp_client: MCPClient) -> CompiledStateGraph:
    """
    Creates and returns a LangGraph StateGraph for appointment scheduling.
    """
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
    ]
    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0).bind_tools(tools=tools)

    def classify_intent(state: AppointmentState):
        print(state)
        prompt = f"""
        You are an inbound calling assistant for a clinic.

        Your main tasks:
        1. Understand what the patient needs (schedule, cancel, reschedule, or general knowledge)
        2. Gather required information conversationally
        3. Once you have all needed info, call the appropriate tool
        4. Confirm the action and ask if they need anything else
        5. If the user wants to end the call return **FINISH_CONVERSATION** only.
        6. For all factual or general questions about the clinic (e.g., timings, services, holidays, doctors, etc.),
        7. call tools when needed and check responss before answering. don't call same tool multiple times for same question.
        8. If the user wants to talk with a human return **NEEDS_HUMAN_INTERVENTION**.
        you must use the retriever tool to find accurate information.
        Do not answer such questions directly from your own memory.

        Always call retriever with the user's query before answering any factual question.

        Guidelines:
        - Be conversational and brief (this is a phone call, not a chat)
        - Ask for missing info naturally,
        - Don't repeat information back unless confirming an action
        - When the patient wants to end the call (says bye, that's all, etc.), thank them warmly
        - After completing an action, ask if there's anything else you can help with

        Remember: You're on a voice call, so keep responses concise and natural."""
        response = llm.invoke(
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
        return {"messages": [response]}

    workflow = StateGraph(AppointmentState)
    workflow.add_node("classify_intent", classify_intent)
    workflow.add_node("tools", ToolNode(tools=tools))

    workflow.set_entry_point("classify_intent")
    workflow.add_conditional_edges(
        "classify_intent", tools_condition, {"tools": "tools", END: "log"}
    )
    workflow.add_edge("tools", "classify_intent")
    workflow.add_node("log", lambda s: print(s))
    workflow.set_finish_point("log")
    return workflow.compile()
