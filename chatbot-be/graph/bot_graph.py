from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from langgraph.graph import START, StateGraph, END
from nodes import tool_node, ask_user, route, route_after_ask, reasoner_node
from graph_state import ChatState
import asyncmy
from langgraph.checkpoint.mysql.asyncmy import AsyncMySaver
from configs import DB_HOST, DB_PASS, DB_PORT, DB_USER, DB
from dotenv import load_dotenv

# Load environment variables as early as possible
load_dotenv()

compiled_graph = None
my_checkpointer = None
checkpointer_conn = None

def create_chatbot_graph() -> StateGraph:
    """
    Creates and returns a LangGraph StateGraph for the chatbot.
    """
    workflow = StateGraph(ChatState)
    workflow.add_node("reasoner", reasoner_node)
    workflow.add_node("tools", tool_node)
    workflow.add_node("ask_user", ask_user)
    workflow.add_edge(START, "reasoner")
    workflow.add_conditional_edges("reasoner", route, {"tools": "tools", "ask_user": "ask_user"})
    workflow.add_conditional_edges("ask_user", route_after_ask, {"reasoner": "reasoner", "END": END})
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
        graph = create_chatbot_graph()
        compiled_graph = graph.compile(checkpointer=my_checkpointer)
        print("LangGraph and MySQL Checkpointer initialized successfully.")
        yield
    except Exception as e:
        print(f"Failed to initialize: {e}")
        raise

async def get_graph() -> StateGraph:
    if compiled_graph is None:
        raise HTTPException(status_code=500, detail="LangGraph not initialized.")
    return compiled_graph