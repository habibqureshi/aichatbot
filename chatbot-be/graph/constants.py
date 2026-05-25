from enum import StrEnum
from typing import Annotated, List, Optional

from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages
from pydantic import BaseModel
from enum import StrEnum

class BookingStatus(StrEnum):
    CONFIRMED = "Confirmed"
    NOT_CONFIRMED = "NotConfirmed"

class GraphNode(StrEnum):
    SUPERVISOR = "supervisor"
    UNSUPPORTED = "unsupported"
    ReservationAgent= "ReservationAgent"
    FAQ ="FaqAgent"
   
   
class IntentGraphState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    user_input: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    next_agent: Optional[str] = None
    booking_status: Optional[BookingStatus] = BookingStatus.NOT_CONFIRMED


