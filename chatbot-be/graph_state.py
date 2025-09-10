from typing import TypedDict, Annotated, List, Optional
from langchain_core.messages import BaseMessage

class ChatState(TypedDict):
    messages: Annotated[List[BaseMessage], "List of messages in the conversation"]
    user_input: Annotated[str, "Current user input"]
    agent_scratchpad: Annotated[List[BaseMessage], "Agent's reasoning and tool calls"]
    next_action: Annotated[Optional[str], "Next action to take"]
    final_answer: Annotated[Optional[str], "Final answer to user"]
