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
from logging import Logger


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
    menu_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="MENU", tenant_id=tenant_id
    )
    business_setting = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    )
    tags = ["common", business_setting]
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
        if not tags or set(tool.meta.get("_fastmcp", {}).get("tags", [])) & set(tags)
    ]
    # INSERT_YOUR_CODE
    log.info("Appointment Graph: tools added to workflow:")
    for t in tools:
        log.info(f"  - {getattr(t, 'name', getattr(t, '__name__', str(t)))}")

    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0).bind_tools(tools=tools)

    def classify_intent(state: AppointmentState):
        log.info(state)
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
        - NEVER invent information or names or answer from memory. (User messages is your only source of truth about the caller and their needs)
        - Always confirm details with the caller before taking any action
        - After completing any action, ask if they need anything else

        For questions about the business OR custom capabilities:
        1. Call retriever with caller's query
        2. Answer ONLY from retrieved info
        3. If no info found: "I'm sorry, I don't have that information right now."

        SPECIAL CASES:
        - If the caller wants to talk to a human, analyze the conversation and return a warm, apologetic message and end with **NEEDS_HUMAN_INTERVENTION**.
        - If the caller wants to end the call, analyze the conversation and return a polite call-ending message and end with **FINISH_CONVERSATION** only.

        Current time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
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
