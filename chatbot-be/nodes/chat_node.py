from typing import Literal
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.prebuilt import ToolNode
from langgraph.graph import END
from langgraph.types import interrupt

from aimodels import llm
from graph_state import ChatState
from tools.rag_tool import search_knowledge_base


@tool
def add(a: int, b: int) -> int:
    """Return the sum of two numbers."""
    return a + b

@tool
def multiply(a: int, b: int) -> int:
    """Return the product of two numbers."""
    return a * b

tools = [add, multiply, search_knowledge_base]
tool_node = ToolNode(tools)
llm_with_tools = llm.bind_tools(tools)

def reasoner_node(state: ChatState) -> dict:
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def route(state: ChatState) -> Literal["tools", "ask_user"]:
    last = state["messages"][-1]
    # If the AIMessage includes tool_calls, go to tools; else finish
    if getattr(last, "tool_calls", None):
        return "tools"
    return "ask_user"

def ask_user(state: ChatState) -> dict:
    # interrupt pauses the graph and asks the user
    reply = interrupt("You:")
    return {"user_reply": reply, "messages": [HumanMessage(content=reply)]}

def route_after_ask(state: ChatState) -> Literal["reasoner", "END"]:
    user_reply = state.get("user_reply", "")
    if isinstance(user_reply, str) and user_reply.strip().lower() in ("quit", "exit"):
        return END
    return "reasoner"
