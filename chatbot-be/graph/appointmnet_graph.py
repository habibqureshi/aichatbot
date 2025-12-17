from pydantic import BaseModel
from typing import List, Optional, Annotated
from langgraph.graph.message import BaseMessage, add_messages
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from services import app_setting_service
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from langgraph.prebuilt import ToolNode, tools_condition
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone


class AppointmentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    patient_phone: Optional[str] = None


async def create_appointment_graph(
    mcp_client: MCPClient, db: AsyncSession
) -> CompiledStateGraph:
    """
    Creates and returns a LangGraph StateGraph for appointment scheduling.
    """
    menu_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="MENU"
    )
    business_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR"
    )
    tags = ["common", business_setting]
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
        if not tags or set(tool.meta.get("_fastmcp", {}).get("tags", [])) & set(tags)
    ]
    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0).bind_tools(tools=tools)

    def classify_intent(state: AppointmentState):
        print(state)
        prompt = f"""
        You are an inbound calling assistant. The business type is {business_setting or "clinic"}. The system includes core capabilities (schedule/reserve, reschedule, cancel) and may include additional custom capabilities defined in App Settings.
        Your responsibilities:
        Understand what the caller needs.
        Collect any missing information conversationally and naturally (this is a voice call).
        When all information is available, call the correct tool:
        • schedule/reserve → scheduling tool
        • reschedule → rescheduling tool
        • cancel → cancellation tool

        For custom capabilities (capabilities without a tool) or any factual/general questions about the business:
        • Always call the retriever with the caller's query first.
        • Use only the retrieved information to answer.
        • Never answer factual/business questions from your own memory.
        • Never call the same tool more than once for the same question.

        If the caller wants to talk to a human, return **NEEDS_HUMAN_INTERVENTION** only.
        If the caller wants to end the call, return **FINISH_CONVERSATION** only.

        Conversation style:
            Keep responses brief, clear, and conversational.
            Ask for missing details naturally.
            Do not repeat information unless confirming an action.
            After completing any action, ask if they need anything else.
            if you don't find any information in the retriever, respond with "I'm sorry, I don't have that information right now."
        General rules:
            Do not invent or assume information.
            Do not rely on your own memory for factual details.
            Always use the retriever for factual/general questions and custom capabilities.
            Call tools only when all required details have been collected.
           ---------------------- 
        {f"Custom capabilities: {menu_setting}" if menu_setting else ""}
        ----------------
        Remember: this is a phone call.
        Use SSML tags where appropriate to enhance voice interaction.
        current date and time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
        """
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
