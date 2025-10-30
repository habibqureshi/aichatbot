from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from langgraph.graph import START, StateGraph, END
from nodes import ask_user, route, route_after_ask, reasoner_node_builder
from graph_state import ChatState
from langgraph.prebuilt import ToolNode
import asyncmy
from langgraph.checkpoint.mysql.asyncmy import AsyncMySaver
from configs import DB_HOST, DB_PASS, DB_PORT, DB_USER, DB, MCP_URL
from dotenv import load_dotenv
from utils.mcp_client import MCPClient
from langchain_mcp_adapters.tools import (
    convert_mcp_tool_to_langchain_tool,
)
from aimodels import llm

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
        checkpointer_conn = await asyncmy.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            db=DB,
            autocommit=True,
        )

        my_checkpointer = AsyncMySaver(conn=checkpointer_conn)
        await my_checkpointer.setup()
        print("LangGraph and MySQL Checkpointer initialized successfully.")
        yield
    except Exception as e:
        print(f"Failed to initialize: {e}")
        raise


async def get_graph() -> StateGraph:
    global my_checkpointer
    mcp_client = MCPClient()
    success = await mcp_client.connect(url=MCP_URL, headers={})
    if not success:
        raise ConnectionError("Error during setup. Contact administrator!")
    graph = await create_chatbot_graph(mcp_client)
    compiled_graph = graph.compile(checkpointer=my_checkpointer)
    return compiled_graph
