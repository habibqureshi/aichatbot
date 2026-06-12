import asyncio
import random

from langchain_core.messages import BaseMessage
from langgraph.graph.state import CompiledStateGraph
from db.models import Conversation, Message

_CARTESIA_VOICE_IDS = [
    "47c38ca4-5f35-497b-b1a3-415245fb35e1",
    "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    "e8e5fffb-252c-436d-b842-8879b84445b6",
    "f039066f-cdb7-45ed-b51d-1034ae2f04a0",
]


class OrderVoiceSessionState:
    """Mutable call-scoped state shared across voice pipeline tasks."""

    def __init__(self, installed_for: str) -> None:
        self.stream_sid: str | None = None
        self.call_sid: str | None = None
        self.messages: list[BaseMessage] = []
        self.graph: CompiledStateGraph | None = None
        self.conversation: Conversation = None
        self.cartesia_kw = {
            "model_id": "sonic-3",
            "voice": {
                "id": random.choice(_CARTESIA_VOICE_IDS),
                "mode": "id",
            },
            "output_format": {
                "container": "raw",
                "encoding": "pcm_mulaw",
                "sample_rate": 8000,
            },
        }
        self.stop_event: asyncio.Event = asyncio.Event()
        self.human_event: asyncio.Event = asyncio.Event()
        self.interrupt_event: asyncio.Event = asyncio.Event()
        self.playback_done_event: asyncio.Event = asyncio.Event()
        self.installed_for: str = installed_for
        self.db_messages: list[Message] = []
        self.stt_queue: asyncio.Queue[str] = asyncio.Queue()
        self.tts_queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        self.task: asyncio.Task | None = None
