from langgraph.types import Command
from langchain_core.messages import HumanMessage, SystemMessage
from openai import BaseModel
from aimodels.llm import small_llm
from graph.constants import GraphNode, IntentGraphState


class RouterOutput(BaseModel):
    next_agent: GraphNode
    model_config = {"extra": "forbid"}


def supervisor_node(state: IntentGraphState) -> Command:
    # INSERT_YOUR_CODE
    if state.next_agent is not None:
        # Go directly to next_agent node
        return Command(
            goto=state.next_agent,
            update={
                "userInput": state.userInput,
                "next_agent": state.next_agent,
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
    # print(state)
    user_msg = HumanMessage(content=state.userInput)
    resp = small_llm.with_structured_output(RouterOutput).invoke(
        [system_msg, user_msg], config={"tags": ["nostream"]}
    )
    print("supervisor_node", resp)
    # TODO need to review the logic of next agent and unsupported node
    return Command(
        goto=(resp.next_agent),
        update={
            # "messages": [user_msg],
            "userInput": state.userInput,
            "next_agent": resp.next_agent,
        },
    )


def unsupported() -> Command:
    print("unsupported")
