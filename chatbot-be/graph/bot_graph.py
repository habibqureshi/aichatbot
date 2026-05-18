from contextlib import asynccontextmanager
from fastapi import FastAPI
from langgraph.graph import START, StateGraph, END
from nodes import ask_user, route, route_after_ask, reasoner_node_builder
from graph_state import ChatState
from langgraph.prebuilt import ToolNode
from db.db import init_db
from configs import MCP_URL
from dotenv import load_dotenv
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)
from sqlalchemy.ext.asyncio import AsyncSession
from aimodels import llm
from graph.appointmnet_graph import create_appointment_graph
from graph.order_graph import create_order_graph
from rag.indexing.store import init_ChromaDB
from logging import Logger
from graph.clinic_graph import create_clinic_graph

# Load environment variables as early as possible
load_dotenv()

compiled_graph = None
my_checkpointer = None
checkpointer_conn = None


async def create_chatbot_graph(mcp_client: MCPClient) -> StateGraph:
    """
    Creates and returns a LangGraph StateGraph for the chatbot.
    """
    tools = [
        convert_mcp_tool_to_langchain_tool(session=mcp_client.session, tool=tool)
        for tool in await mcp_client.client.list_tools()
    ]

    def handle_tool_error(error: Exception) -> str:
        import traceback

        print(traceback.format_exc())

        return f"Error in: {traceback.format_exc()}"

    llm_with_tools = llm.bind_tools(tools=tools)
    workflow = StateGraph(ChatState)
    workflow.add_node("reasoner", reasoner_node_builder(llm_with_tools))
    workflow.add_node(
        "tools", ToolNode(tools=tools, handle_tool_errors=handle_tool_error)
    )
    workflow.add_node("ask_user", ask_user)
    workflow.add_edge(START, "reasoner")
    workflow.add_conditional_edges(
        "reasoner", route, {"tools": "tools", "ask_user": "ask_user"}
    )
    workflow.add_conditional_edges(
        "ask_user", route_after_ask, {"reasoner": "reasoner", "END": END}
    )
    workflow.add_edge("tools", "reasoner")
    return workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifespan of the FastAPI application, including database connection.
    """
    global compiled_graph, my_checkpointer, checkpointer_conn

    try:
        # checkpointer_conn = await asyncmy.connect(
        #     host=DB_HOST,
        #     port=DB_PORT,
        #     user=DB_USER,
        #     password=DB_PASS,
        #     db=DB,
        #     autocommit=True,
        # )

        # my_checkpointer = AsyncMySaver(conn=checkpointer_conn)
        # await my_checkpointer.setup()
        await init_db()
        init_ChromaDB()
        print("LangGraph and MySQL Checkpointer initialized successfully.")
        yield
    except Exception as e:
        print(f"Failed to initialize: {e}")
        raise


async def get_graph(
    call_id: str, patient_number: str, db: AsyncSession, tenant_id: int, log: Logger
) -> StateGraph:
    global my_checkpointer
    mcp_client = MCPClient()
    success = await mcp_client.connect(
        url=MCP_URL,
        headers={
            "x-call-id": call_id,
            "x-patient-no": patient_number,
            "x-tenant-id": str(tenant_id),
        },
    )
    if not success:
        raise ConnectionError("Error during setup. Contact administrator!")
    graph = await create_appointment_graph(mcp_client, db, tenant_id, log)
    # compiled_graph = graph.compile(checkpointer=my_checkpointer)
    return graph


async def get_order_graph(
    call_id: str,
    customer_phone: str,
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    customer_name: str,
):
    """Order graph with local DB + Chroma tools; MCP adds extra tools when reachable."""
    mcp_client = MCPClient()
    success = await mcp_client.connect(
        url=MCP_URL,
        headers={
            "x-call-id": call_id,
            "x-patient-no": customer_phone,
            "x-customer-no": customer_phone,
            "x-tenant-id": str(tenant_id),
        },
    )
    if not success:
        log.warning(
            "Order graph: MCP unreachable at %s; continuing with local tools only.",
            MCP_URL,
        )
        mcp_client = None
    return await create_order_graph(
        mcp_client,
        db,
        tenant_id,
        log,
        customer_phone=customer_phone,
        call_sid=call_id,
        customer_name=customer_name,
    )


async def get_appointment_graph(
    call_id: str, patient_number: str, db: AsyncSession, tenant_id: int, log: Logger
):
    """Appointment graph with local DB tools; MCP adds extra tools when reachable."""
    mcp_client = MCPClient()
    success = await mcp_client.connect(
        url=MCP_URL,
        headers={
            "x-call-id": call_id,
            "x-patient-no": patient_number,
            "x-tenant-id": str(tenant_id),
        },
    )
    if not success:
        log.warning(
            "Appointment graph: MCP unreachable at %s; continuing with local tools only.",
            MCP_URL,
        )
        mcp_client = None
    return await create_appointment_graph(mcp_client, db, tenant_id, log)


async def get_clinic_graph(
    call_id: str,
    customer_phone: str,
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    customer_name: str,
):
    """Clinic graph with local DB tools; MCP adds extra tools when reachable."""
    mcp_client = MCPClient()
    success = await mcp_client.connect(
        url=MCP_URL,
        headers={
            "x-call-id": call_id,
            "x-patient-no": customer_phone,
            "x-tenant-id": str(tenant_id),
        },
    )
    if not success:
        log.warning(
            "Clinic graph: MCP unreachable at %s; continuing with local tools only.",
            MCP_URL,
        )
        mcp_client = None
    return await create_clinic_graph(
        mcp_client,
        db,
        tenant_id,
        log,
        customer_phone=customer_phone,
        customer_name=customer_name,
        call_sid=call_id,
    )


async def get_chat_graph():
    global my_checkpointer
    mcp_client = MCPClient()
    success = await mcp_client.connect(url=MCP_URL, headers={})
    if not success:
        raise ConnectionError("Error during setup. Contact administrator!")
    graph = await create_chatbot_graph(mcp_client=mcp_client)
    graph = graph.compile(checkpointer=my_checkpointer)
    return graph
