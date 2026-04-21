import asyncio
import base64
import datetime
from collections.abc import AsyncIterator
import json
import os
import re
import time
import websockets
import websockets.exceptions
from logging import Logger
from fastapi.websockets import WebSocketState
from sqlalchemy import event, log
from twilio.twiml.voice_response import Connect, VoiceResponse, Start, Gather
from fastapi import (
    HTTPException,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
)
import numpy as np
from langchain_openai import ChatOpenAI
import random


# import webrtcvad
# import whisper
# from piper import PiperVoice, SynthesisConfig
from schemas.appointment import StreamState
from schemas.twilio import TwilioIncoming
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import URL
from services import (
    customer_service,
    conversation_service,
    message_service,
    app_setting_service,
)
from graph.bot_graph import get_order_graph
from graph.intent_graph import voice_ai_graph
from langgraph.graph.state import CompiledStateGraph, RunnableConfig
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    AIMessageChunk,
)
from graph.order_graph import OrderState
from twilio.rest import Client
from configs import (
    CARTESIA_API_KEY,
    OPENAI_API_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    MCP_URL,
)
from langfuse import get_client
from langfuse.langchain import CallbackHandler
import random

DEFAULT_PHRASES = [
    "One moment, please.",
    "Just a second.",
    "Let me take care of that.",
    "Checking that for you now.",
    "One moment while I handle it.",
]

TOOL_PHRASES = {
    "list_menu": [
        "Let me pull up the menu for you.",
        "Just checking the menu right now.",
        "One moment while I get the menu.",
    ],
    "create_order": [
        "I'm setting up your order now. One moment.",
        "Got it, starting your order now.",
        "Let me create your order real quick.",
    ],
    "add_order_item": [
        "Adding that to your order.",
        "Got it, adding it now.",
        "One moment, I'm updating your order.",
    ],
    "confirm_order": [
        "Confirming your order now.",
        "Let me finalize your order.",
        "Almost done, confirming everything now.",
    ],
    "cancel_order": [
        "Updating your order.",
        "Cancelling that for you now.",
        "One moment, I’ll handle the cancellation.",
    ],
    "update_order_item": [
        "Updating your order.",
        "Making that change now.",
        "One moment, updating it.",
    ],
    "remove_order_item": [
        "Updating your order.",
        "Removing that for you now.",
        "One moment, I’m updating it.",
    ],
    "get_order": [
        "Let me check your order and reservations.",
        "One moment while I pull up your order.",
        "Checking your current order now.",
    ],
    "price_order": [
        "Getting pricing details for you.",
        "Let me check the total for you.",
        "One moment while I calculate that.",
    ],
    "get_my_latest_order_and_reservations": [
        "Let me check your order and reservations.",
        "Pulling your latest details now.",
        "Checking your recent activity.",
    ],
    "get_customer_profile": [
        "Let me check your saved details.",
        "One moment while I pull your profile.",
        "Checking your information now.",
    ],
    "update_customer_profile": [
        "Got it, updating your details now.",
        "Saving your changes now.",
        "Updating your profile.",
    ],
    "knowledge_retriever": [
        "Let me look that up for you.",
        "Checking that for you now.",
        "One moment while I find that information.",
    ],
    "check_table_availability": [
        "Let me check table availability for you.",
        "Checking tables for that time now.",
        "One moment while I check availability.",
    ],
    "reserve_table": [
        "Great, I'll reserve a table for you now.",
        "Booking your table now.",
        "One moment while I make the reservation.",
    ],
    "update_reservation": [
        "Sure, let me update your reservation.",
        "Updating your booking now.",
        "One moment, changing your reservation.",
    ],
    "cancel_reservation": [
        "Okay, I'll cancel that reservation now.",
        "Cancelling your booking now.",
        "One moment, removing your reservation.",
    ],
}


from cartesia import AsyncCartesia

cartesia_client = AsyncCartesia(api_key=CARTESIA_API_KEY)
openai_client = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

SAMPLING_RATE = 8000
CHUNK_SIZE = 160
VAD_AGGRESSIVENESS = 3
SILENCE_THRESHOLD_MS = 500

# How long (in seconds) to wait for the user to speak after Twilio finishes
# playing the AI's audio before prompting "Hello are you still there?".
# The same value is reused after the 2nd unanswered prompt before the call
# is ended with a goodbye message.
SILENCE_PROMPT_WAIT_SEC: float = float(os.getenv("SILENCE_PROMPT_WAIT_SEC", "3"))
# Maximum number of "still there?" prompts before ending the call.
SILENCE_MAX_PROMPTS: int = int(os.getenv("SILENCE_MAX_PROMPTS", "2"))

# Initialize Langfuse client
langfuse = get_client()


# Initialize Langfuse CallbackHandler for Langchain (tracing)
langfuse_handler = CallbackHandler()


background_tasks = BackgroundTasks()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
# vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
# syn = SynthesisConfig(volume=0.7)
# whisper_model = whisper.load_model("small")
# voice = PiperVoice.load(
#     "/home/hammad/Documents/techbucks/custom-tts/en_US-lessac-medium.onnx"
# )
VOICE = "Polly.Joanna-Neural"
DEFAULT_ORDER_GREETING = "How can I help you today?"
ORDER_GREETING_KEY = "GREETING"
_ORDER_GREETING_CACHE: dict[int, str] = {}


def _stream_chunk_text(chunk) -> str:
    """Extract text delta from an AIMessageChunk (string or block list)."""
    c = getattr(chunk, "content", None)
    if not c:
        return ""
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts: list[str] = []
        for part in c:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(str(part.get("text", "")))
            elif isinstance(part, str):
                parts.append(part)
        return "".join(parts)
    return str(c)


def _norm_joined_tts(s: str) -> str:
    """Normalize assistant text for comparing streamed TTS vs final AIMessage.content."""
    t = s.replace("\n", " ")
    t = re.sub(r"([.!?])([A-Za-z\"'])", r"\1 \2", t)
    return " ".join(t.split())


def _spoken_covers_final_classify(spoken_joined: str, final_text: str) -> bool:
    """True if streamed TTS already covers the final assistant message (skip completion fallback)."""
    ns = _norm_joined_tts(spoken_joined)
    nf = _norm_joined_tts(final_text)
    if not nf:
        return True
    if ns == nf:
        return True
    if len(nf) >= 12 and nf in ns:
        return True
    if len(nf) >= 12 and ns.endswith(nf):
        return True
    return False


def _extract_caller_name_from_text(user_text: str) -> str | None:
    text = (user_text or "").strip()
    if not text:
        return None
    patterns = [
        r"(?:my name is|i am|i'm|this is)\s+([A-Za-z][A-Za-z\-' ]{1,60})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        candidate = " ".join(match.group(1).split()).strip(" .,!?:;")
        if not candidate:
            continue
        parts = [p for p in candidate.split() if p]
        if not parts:
            continue
        return " ".join(part.capitalize() for part in parts[:4])
    return None


DEFAULT_PHRASES = [
    "One moment, please.",
    "Just a second.",
    "Let me take care of that.",
    "Checking that for you now.",
    "One moment while I handle it.",
]

TOOL_PHRASES = {
    "list_menu": [
        "Let me pull up the menu for you.",
        "Just checking the menu right now.",
        "One moment while I get the menu.",
    ],
    "create_order": [
        "I'm setting up your order now. One moment.",
        "Got it, starting your order now.",
        "Let me create your order real quick.",
    ],
    "add_order_item": [
        "Adding that to your order.",
        "Got it, adding it now.",
        "One moment, I'm updating your order.",
    ],
    "confirm_order": [
        "Confirming your order now.",
        "Let me finalize your order.",
        "Almost done, confirming everything now.",
    ],
    "cancel_order": [
        "Updating your order.",
        "Cancelling that for you now.",
        "One moment, I’ll handle the cancellation.",
    ],
    "update_order_item": [
        "Updating your order.",
        "Making that change now.",
        "One moment, updating it.",
    ],
    "remove_order_item": [
        "Updating your order.",
        "Removing that for you now.",
        "One moment, I’m updating it.",
    ],
    "get_order": [
        "Let me check your order and reservations.",
        "One moment while I pull up your order.",
        "Checking your current order now.",
    ],
    "price_order": [
        "Getting pricing details for you.",
        "Let me check the total for you.",
        "One moment while I calculate that.",
    ],
    "get_my_latest_order_and_reservations": [
        "Let me check your order and reservations.",
        "Pulling your latest details now.",
        "Checking your recent activity.",
    ],
    "get_customer_profile": [
        "Let me check your saved details.",
        "One moment while I pull your profile.",
        "Checking your information now.",
    ],
    "update_customer_profile": [
        "Got it, updating your details now.",
        "Saving your changes now.",
        "Updating your profile.",
    ],
    "knowledge_retriever": [
        "Let me look that up for you.",
        "Checking that for you now.",
        "One moment while I find that information.",
    ],
    "check_table_availability": [
        "Let me check table availability for you.",
        "Checking tables for that time now.",
        "One moment while I check availability.",
    ],
    "reserve_table": [
        "Great, I'll reserve a table for you now.",
        "Booking your table now.",
        "One moment while I make the reservation.",
    ],
    "update_reservation": [
        "Sure, let me update your reservation.",
        "Updating your booking now.",
        "One moment, changing your reservation.",
    ],
    "cancel_reservation": [
        "Okay, I'll cancel that reservation now.",
        "Cancelling your booking now.",
        "One moment, removing your reservation.",
    ],
}


def _tool_hold_phrase(tool_calls: list) -> str:
    """Short voice line while MCP tools run (tool-only model turns have no streamed text)."""
    if not tool_calls:
        return random.choice(DEFAULT_PHRASES)
    first = tool_calls[0]
    if isinstance(first, dict):
        name = str(first.get("name") or "")
    else:
        name = str(getattr(first, "name", "") or "")
    return random.choice(TOOL_PHRASES.get(name, DEFAULT_PHRASES))


VOICE_FORBIDDEN_MARKERS: tuple[str, ...] = (
    "**FINISH_CONVERSATION**",
    "**NEEDS_HUMAN_INTERVENTION**",
)

_VOICE_FORBIDDEN_CORES: tuple[str, ...] = (
    "FINISH_CONVERSATION",
    "NEEDS_HUMAN_INTERVENTION",
)

_VOICE_FORBIDDEN_LEAK_RE = re.compile(
    r"(?i)(\s*\*+)*(FINISH_CONVERSATION|NEEDS_HUMAN_INTERVENTION)(\*+|\s)*",
)


async def _get_cached_order_greeting(db: AsyncSession, tenant_id: int) -> str:
    cached = _ORDER_GREETING_CACHE.get(tenant_id)
    if cached is not None:
        return cached

    greeting_setting = await app_setting_service.get_app_setting_by_key(
        db=db,
        key=ORDER_GREETING_KEY,
        tenant_id=tenant_id,
    )
    greeting = (
        greeting_setting.value.strip()
        if greeting_setting
        and greeting_setting.value
        and greeting_setting.value.strip()
        else DEFAULT_ORDER_GREETING
    )
    _ORDER_GREETING_CACHE[tenant_id] = greeting
    return greeting


async def _build_order_greeting_message(
    db: AsyncSession,
    tenant_id: int,
    customer_name: str | None,
) -> str:
    greeting = await _get_cached_order_greeting(db=db, tenant_id=tenant_id)
    if customer_name and customer_name.strip():
        return f"Hi {customer_name.strip()}, {greeting}"
    return f"Hi, {greeting} Before we begin, may I have your name?"


async def _iter_cartesia_audio(ctx) -> AsyncIterator[bytes]:
    async for response in ctx.receive():
        if response.type == "chunk" and response.audio:
            yield response.audio


# All local LangChain tools that emit stream_writer events.
_ORDER_STREAM_TOOL_NAMES = frozenset(
    {
        "list_menu",
        "create_order",
        "add_order_item",
        "update_order_item",
        "remove_order_item",
        "cancel_order",
        "confirm_order",
        "get_order",
        "get_my_latest_order_and_reservations",
        "price_order",
        "get_customer_profile",
        "update_customer_profile",
        "knowledge_retriever",
        "check_table_availability",
        "reserve_table",
        "update_reservation",
        "cancel_reservation",
    }
)


async def ws_greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: str,
    recording_status_callback: URL,
    tenant_id: int,
    log: Logger,
):
    resp = VoiceResponse()
    log.info(f"Websocket greeting for {data.From}")
    customer = await customer_service.find_or_create_by_phone(
        data.From, db=db, tenant_id=tenant_id
    )
    log.info(
        f"customer found {customer.name} {customer.id}"
        if customer
        else "customer not found"
    )

    await conversation_service.find_or_create_for_customer(
        data=data, customer=customer, db=db, tenant_id=tenant_id
    )
    log.info(f"conversation created for {data.CallSid}")
    start = Start()
    start.recording(
        recording_status_callback=recording_status_callback,
        track="both",
        channels="mono",
    )
    resp.append(start)
    connect = Connect()
    connect.stream(url=action_url)
    resp.append(connect)
    return resp


async def stream_call(
    websocket: WebSocket, db: AsyncSession, tenant_id: int, log: Logger
):
    await websocket.accept()


OPENAI_URL = (
    "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17"
)
# Default websockets open handshake is short; Realtime can be slow on constrained networks.
_OPENAI_REALTIME_OPEN_TIMEOUT = float(os.getenv("OPENAI_REALTIME_OPEN_TIMEOUT", "60"))
_OPENAI_REALTIME_CONNECT_RETRIES = int(
    os.getenv("OPENAI_REALTIME_CONNECT_RETRIES", "3")
)


async def _connect_openai_realtime_stt(log: Logger):
    """Connect to OpenAI Realtime with a generous handshake timeout and retries."""
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }
    last_exc: Exception | None = None
    for attempt in range(1, _OPENAI_REALTIME_CONNECT_RETRIES + 1):
        try:
            ws = await websockets.connect(
                OPENAI_URL,
                open_timeout=_OPENAI_REALTIME_OPEN_TIMEOUT,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=10,
                additional_headers=headers,
            )
            if attempt > 1:
                log.info("OpenAI Realtime WebSocket connected on attempt %s", attempt)
            return ws
        except (TimeoutError, OSError, websockets.exceptions.InvalidHandshake) as e:
            last_exc = e
            log.warning(
                "OpenAI Realtime WebSocket connect failed (attempt %s/%s): %s",
                attempt,
                _OPENAI_REALTIME_CONNECT_RETRIES,
                e,
            )
            if attempt < _OPENAI_REALTIME_CONNECT_RETRIES:
                await asyncio.sleep(min(2**attempt, 10))
    assert last_exc is not None
    log.error(
        "Giving up on OpenAI Realtime after %s attempts",
        _OPENAI_REALTIME_CONNECT_RETRIES,
    )
    raise last_exc


class OrderVoiceSessionState:
    """Mutable call-scoped state shared by ReceiveVoiceSession and SendVoiceSession."""

    def __init__(self) -> None:
        self.stream_sid: str | None = None
        self.messages: list[BaseMessage] = []
        self.graph: CompiledStateGraph | None = None
        self.customer = None
        self.conversation = None
        self.interrupt_event = asyncio.Event()
        self.stop_event = asyncio.Event()
        self.human_event = asyncio.Event()


async def openai_stream(
    websocket: WebSocket, db: AsyncSession, tenant_id: int, log: Logger
):
    state = OrderVoiceSessionState()
    openai_stt = await _connect_openai_realtime_stt(log)
    await openai_stt.send(
        json.dumps(
            {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "input_audio_noise_reduction": {"type": "near_field"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.45,
                        # Too low (e.g. 200) ends turns mid-sentence; speech looks "unheard" / wrong intent.
                        "silence_duration_ms": 400,
                        "prefix_padding_ms": 300,
                        "create_response": False,
                        "interrupt_response": False,
                    },
                    "input_audio_format": "g711_ulaw",
                    "input_audio_transcription": {
                        "model": "gpt-4o-mini-transcribe",
                        "language": "en",
                        "prompt": ("Restaurant phone ordering in English."),
                    },
                },
            }
        )
    )
    log.info("Connected to OpenAI STT WebSocket")
    log.info(
        "SESSION | openai_stream | OpenAI STT connected; starting Cartesia + Twilio duplex"
    )
    try:
        async with cartesia_client.tts.websocket_connect() as connection:
            await websocket.accept()
            log.info(
                "SESSION | WebSocket accepted; spawning receive (STT→graph) + send (Twilio→STT)"
            )

            receive_session = ReceiveVoiceSession(
                websocket,
                openai_stt,
                connection,
                state,
                message_service,
                db,
                tenant_id,
                log,
            )
            send_session = SendVoiceSession(
                websocket,
                openai_stt,
                connection,
                state,
                conversation_service,
                customer_service,
                message_service,
                db,
                tenant_id,
                log,
                receive_session=receive_session,
            )
            await asyncio.gather(
                receive_session.receive_from_openai(),
                send_session.send_to_openai(),
            )
    except websockets.exceptions.InvalidStatus as exc:
        # Cartesia returns HTTP 402 when billing/credits are insufficient or key is invalid.
        resp = getattr(exc, "response", None)
        status = getattr(resp, "status_code", None) or getattr(resp, "status", None)
        hint = (
            "HTTP 402 = Payment Required from Cartesia: top up credits, confirm your plan, "
            "and verify CARTESIA_API_KEY in the environment."
            if status == 402
            else "Check Cartesia status, API key, and account access."
        )
        log.error(
            "Cartesia TTS WebSocket rejected (HTTP %s). %s | detail=%s",
            status,
            hint,
            exc,
        )
        log.error(
            "CARTESIA_FAIL | WebSocket handshake HTTP %s | %s",
            status,
            hint,
        )
        try:
            await openai_stt.close()
        except Exception:
            pass
        try:
            if websocket.client_state == WebSocketState.CONNECTING:
                await websocket.accept()
            await websocket.close(code=1011)
        except Exception:
            pass


class ReceiveVoiceSession:

    def __init__(
        self,
        websocket,
        openai_stt,
        connection,
        state: OrderVoiceSessionState,
        message_service,
        db,
        tenant_id,
        log,
    ):
        self.websocket = websocket
        self.openai_stt = openai_stt
        self.connection = connection
        self.state = state
        self.message_service = message_service
        self.db = db
        self.tenant_id = tenant_id
        self.tts_queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        self._voice_cycle_task: asyncio.Task | None = None
        self._silence_task: asyncio.Task | None = None
        self._silence_prompts_sent: int = 0
        # Track outbound audio so silence timer waits for Twilio playback to drain
        # instead of firing while the user is still hearing the response.
        self._playback_started_at: float | None = None
        self._playback_bytes_sent: int = 0
        # Playback-done signal driven by Twilio mark event echo for exact timing.
        self._playback_done_event: asyncio.Event = asyncio.Event()
        self._pending_mark_name: str | None = None
        self._mark_counter: int = 0
        self.log = log

        self.cartesia_kw = {
            "model_id": "sonic-3",
            "voice": {
                "id": "f786b574-daa5-4673-aa0c-cbe3e8534c02",
                "mode": "id",
            },
            "output_format": {
                "container": "raw",
                "encoding": "pcm_mulaw",
                "sample_rate": 8000,
            },
        }

    # -------------------------------
    # Silence Watchdog
    # -------------------------------

    def _reset_playback_tracker(self) -> None:
        self._playback_started_at = None
        self._playback_bytes_sent = 0

    def _note_playback_chunk(self, audio_bytes: int) -> None:
        if self._playback_started_at is None:
            self._playback_started_at = time.monotonic()
        self._playback_bytes_sent += max(0, int(audio_bytes))

    def _estimate_remaining_playback_seconds(self) -> float:
        # mulaw 8kHz mono → 8000 bytes per second
        if self._playback_started_at is None or self._playback_bytes_sent <= 0:
            return 0.0
        expected = self._playback_bytes_sent / 8000.0
        elapsed = time.monotonic() - self._playback_started_at
        return max(0.0, expected - elapsed)

    async def _wait_for_playback_drain(self, log_label: str) -> None:
        remaining = self._estimate_remaining_playback_seconds()
        if remaining <= 0:
            return
        self.log.info(
            "SILENCE_PLAYBACK_WAIT | %s | remaining_sec=%.2f | bytes=%d",
            log_label,
            remaining,
            self._playback_bytes_sent,
        )
        await asyncio.sleep(remaining)

    async def _send_playback_done_mark(self, label: str) -> str | None:
        st = self.state
        if not st.stream_sid:
            return None
        self._mark_counter += 1
        name = f"silence_ready_{self._mark_counter}"
        self._pending_mark_name = name
        self._playback_done_event.clear()
        try:
            await self.websocket.send_json(
                {
                    "event": "mark",
                    "streamSid": st.stream_sid,
                    "mark": {"name": name},
                }
            )
            self.log.info(
                "TWILIO_MARK_SENT | label=%s | name=%s | bytes_sent_so_far=%d",
                label,
                name,
                self._playback_bytes_sent,
            )
            return name
        except Exception as e:
            self.log.warning("TWILIO_MARK_SEND_FAILED | %s | err=%s", label, e)
            self._pending_mark_name = None
            return None

    def on_twilio_mark(self, name: str) -> None:
        if not name:
            return
        if self._pending_mark_name and name == self._pending_mark_name:
            self.log.info(
                "TWILIO_MARK_RECEIVED | name=%s | playback confirmed finished",
                name,
            )
            self._pending_mark_name = None
            self._playback_done_event.set()
        else:
            self.log.info("TWILIO_MARK_IGNORED | name=%s (no matching pending)", name)

    async def _wait_until_twilio_finished_playing(self, label: str) -> None:
        """Use Twilio mark echo to wait for actual end of playback.
        Falls back to byte-based estimate if the mark isn't received in time.
        """
        name = await self._send_playback_done_mark(label)
        if not name:
            await self._wait_for_playback_drain(label)
            return
        estimate_sec = self._estimate_remaining_playback_seconds()
        # If Twilio doesn't echo mark reliably, don't add a long penalty.
        # Wait roughly until estimated playback end (+small jitter buffer),
        # then continue so SILENCE_PROMPT_WAIT_SEC starts on time.
        fallback_timeout = max(0.5, estimate_sec + 0.5)
        try:
            await asyncio.wait_for(
                self._playback_done_event.wait(), timeout=fallback_timeout
            )
            self.log.info("TWILIO_MARK_WAIT_DONE | label=%s | via_mark=True", label)
        except asyncio.TimeoutError:
            self.log.warning(
                "TWILIO_MARK_TIMEOUT | label=%s | fallback to estimate "
                "after %.2fs (estimate_sec=%.2f, bytes=%d)",
                label,
                fallback_timeout,
                estimate_sec,
                self._playback_bytes_sent,
            )
            self._pending_mark_name = None

    async def _speak_inactivity_text(self, text: str) -> None:
        st = self.state
        if (
            not text.strip()
            or not st.stream_sid
            or st.stop_event.is_set()
            or st.human_event.is_set()
        ):
            return
        self._reset_playback_tracker()
        ctx = self.connection.context()
        await ctx.send(
            transcript=text,
            continue_=False,
            **self.cartesia_kw,
        )
        async for audio in _iter_cartesia_audio(ctx):
            if st.stop_event.is_set() or st.human_event.is_set():
                break
            self._note_playback_chunk(len(audio))
            await self.websocket.send_json(
                {
                    "event": "media",
                    "streamSid": st.stream_sid,
                    "media": {"payload": base64.b64encode(audio).decode("utf-8")},
                }
            )

    def _cancel_silence_timer(self) -> None:
        had_task = self._silence_task is not None and not self._silence_task.done()
        if had_task:
            self._silence_task.cancel()
            self.log.info(
                "SILENCE_TIMER_CANCEL | prompts_sent_so_far=%d",
                self._silence_prompts_sent,
            )
        self._silence_task = None
        self._silence_prompts_sent = 0

    def _start_silence_timer(self) -> None:
        if self.state.stop_event.is_set() or self.state.human_event.is_set():
            return
        if self._silence_task is not None and not self._silence_task.done():
            self._silence_task.cancel()
        remaining_ms = int(self._estimate_remaining_playback_seconds() * 1000)
        self.log.info(
            "SILENCE_TIMER_START | expected_playback_remaining_ms=%d | audio_bytes_sent=%d",
            remaining_ms,
            self._playback_bytes_sent,
        )
        self._silence_task = asyncio.create_task(self._silence_deadline())

    async def _silence_deadline(self) -> None:
        st = self.state
        try:
            await self._wait_until_twilio_finished_playing(
                "waiting_for_ai_playback_end"
            )
            while self._silence_prompts_sent < SILENCE_MAX_PROMPTS:
                self.log.info(
                    "SILENCE_TIMER_TICK | waiting %.2fs of user silence "
                    "(prompt_next=%d/%d)",
                    SILENCE_PROMPT_WAIT_SEC,
                    self._silence_prompts_sent + 1,
                    SILENCE_MAX_PROMPTS,
                )
                await asyncio.sleep(SILENCE_PROMPT_WAIT_SEC)
                if st.stop_event.is_set() or st.human_event.is_set():
                    return
                self._silence_prompts_sent += 1
                self.log.info(
                    "SILENCE_PROMPT_SPEAK | count=%d | text=%r",
                    self._silence_prompts_sent,
                    "Hello are you still there?",
                )
                await self._speak_inactivity_text("Hello are you still there?")
                await self._wait_until_twilio_finished_playing(
                    "after_inactivity_prompt"
                )
            self.log.info(
                "SILENCE_TIMER_TICK | waiting %.2fs after final prompt before ending call",
                SILENCE_PROMPT_WAIT_SEC,
            )
            await asyncio.sleep(SILENCE_PROMPT_WAIT_SEC)
            if st.stop_event.is_set() or st.human_event.is_set():
                return
            self.log.info("SILENCE_TIMEOUT_END | ending call after two prompts")
            await self._speak_inactivity_text(
                "I did not hear anything, so I will end the call now. Goodbye."
            )
            await self._wait_until_twilio_finished_playing("after_goodbye")
            st.stop_event.set()
        except asyncio.CancelledError:
            return

    def _drain_tts_queue(self) -> None:
        while True:
            try:
                self.tts_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def _prepare_new_voice_cycle(self) -> None:
        if self._voice_cycle_task is not None and not self._voice_cycle_task.done():
            self._voice_cycle_task.cancel()
            try:
                await self._voice_cycle_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                self.log.exception("Voice cycle task ended with error: %s", e)
        self._voice_cycle_task = None
        self._drain_tts_queue()

    # -------------------------------
    # OpenAI STT Receiver
    # -------------------------------

    async def receive_from_openai(self):

        while True:

            if self.state.stop_event.is_set() or self.state.human_event.is_set():
                self.log.info("Termination event detected. Stopping OpenAI receiver.")
                break

            try:
                msg = await self.openai_stt.recv()
                msg = json.loads(msg)

            except websockets.exceptions.ConnectionClosed:
                self.log.info("OpenAI STT WebSocket connection closed")
                break

            self.log.info("Received from OpenAI STT: %s", msg)

            msg_type = msg.get("type")

            if msg_type == "conversation.item.input_audio_transcription.completed":
                await self.handle_transcription_completed(msg)

            elif msg_type == "conversation.item.input_audio_transcription.delta":
                await self.handle_user_interrupt(msg)

    # -------------------------------
    # Final Transcript
    # -------------------------------

    async def handle_transcription_completed(self, msg):

        if self.state.stop_event.is_set() or self.state.human_event.is_set():
            # self.log.info("Ignoring transcript because session is ending.")
            return

        user_text = msg.get("transcript", "").strip()

        # self.log.info(f"User said (final): {user_text}")
        self.log.info("USER_FINAL_TRANSCRIPT | %s", user_text)

        if not user_text:
            return

        await self._maybe_store_customer_name_from_transcript(user_text)

        # self.log.info("Starting TTS synthesis and streaming to Twilio")
        self.log.info(
            "PIPELINE | run_full_ai_cycle scheduled (final transcript only; STT deltas not logged)"
        )

        await self._prepare_new_voice_cycle()
        self.state.interrupt_event.clear()
        self._voice_cycle_task = asyncio.create_task(self.run_full_ai_cycle(user_text))

    async def _maybe_store_customer_name_from_transcript(self, user_text: str) -> None:
        st = self.state
        customer = st.customer
        if customer is None:
            return
        if customer.name and str(customer.name).strip():
            return
        inferred_name = _extract_caller_name_from_text(user_text)
        if not inferred_name:
            return
        customer.name = inferred_name
        try:
            await self.db.commit()
            await self.db.refresh(customer)
            self.log.info(
                "CUSTOMER_NAME_CAPTURED | customer_id=%s name=%r",
                customer.id,
                inferred_name,
            )
        except Exception as e:
            await self.db.rollback()
            self.log.warning("CUSTOMER_NAME_CAPTURE_FAILED | %s", e)

    # -------------------------------
    # User Interrupt
    # -------------------------------

    async def handle_user_interrupt(self, msg):

        delta_text = msg.get("delta", "").strip()

        if not delta_text:
            return

        self._cancel_silence_timer()

        self.log.info("User speaking: '%s'. Silencing AI.", delta_text)

        self.state.interrupt_event.set()

        await self.websocket.send_json(
            {"event": "clear", "streamSid": self.state.stream_sid}
        )

        if self._voice_cycle_task is not None and not self._voice_cycle_task.done():
            self._voice_cycle_task.cancel()
            try:
                await self._voice_cycle_task
            except asyncio.CancelledError:
                pass
        self._voice_cycle_task = None
        self._drain_tts_queue()

    # -------------------------------
    # Full AI Cycle
    # -------------------------------

    async def run_full_ai_cycle(self, user_text):
        self.log.info(
            "RUN_FULL_AI_CYCLE | begin | tasks: stream_llm (graph+LLM async) + twilio_forwarder"
        )
        self._reset_playback_tracker()
        await asyncio.gather(
            self.stream_llm(user_text),
            self.twilio_forwarder(),
        )
        self.log.info(
            "RUN_FULL_AI_CYCLE | end | stream_llm and twilio_forwarder completed | "
            "audio_bytes_sent=%d | est_playback_remaining_sec=%.2f",
            self._playback_bytes_sent,
            self._estimate_remaining_playback_seconds(),
        )
        self._start_silence_timer()

    # -------------------------------
    # Send Audio To Twilio
    # -------------------------------

    async def twilio_forwarder(self):
        _chunks = 0
        _bytes = 0
        while True:
            audio = await self.tts_queue.get()

            if audio is None:
                self.log.info(
                    "TWILIO_FWD | sentinel received | total_chunks=%d total_bytes=%d",
                    _chunks,
                    _bytes,
                )
                return

            if self.state.interrupt_event.is_set():
                continue

            _chunks += 1
            _bytes += len(audio)
            self._note_playback_chunk(len(audio))
            if _chunks == 1:
                self.log.info(
                    "TWILIO_FWD | first audio chunk sent to Twilio | %d bytes",
                    len(audio),
                )
                self.log.info(
                    "yolo3 | first_audio_sent_to_twilio | bytes=%d",
                    len(audio),
                )

            await self.websocket.send_json(
                {
                    "event": "media",
                    "streamSid": self.state.stream_sid,
                    "media": {"payload": base64.b64encode(audio).decode("utf-8")},
                }
            )

    # -------------------------------
    # Receive Audio From Cartesia
    # -------------------------------

    async def pump_cartesia(self, ctx):
        _chunks = 0
        _bytes = 0
        try:
            async for response in ctx.receive():
                if response.type == "chunk" and response.audio:
                    if self.state.interrupt_event.is_set():
                        self.log.info(
                            "CARTESIA_PUMP | interrupted after %d chunks (%d bytes)",
                            _chunks,
                            _bytes,
                        )
                        return
                    _chunks += 1
                    _bytes += len(response.audio)
                    if _chunks == 1:
                        self.log.info(
                            "CARTESIA_PUMP | first audio chunk received | %d bytes",
                            len(response.audio),
                        )
                    self.log.info(
                        "yolo4 | first_audio_received_from_cartesia | bytes=%d",
                        len(response.audio),
                    )
                    await self.tts_queue.put(response.audio)
        except Exception as e:
            self.log.exception("Cartesia receive pump ended: %s", e)
        finally:
            self.log.info(
                "CARTESIA_PUMP | finished | total_chunks=%d total_bytes=%d",
                _chunks,
                _bytes,
            )

    # -------------------------------
    # Send Text To Cartesia
    # -------------------------------

    async def cartesia_send(self, ctx, transcript, continue_=True):

        if not transcript.strip() or self.state.interrupt_event.is_set():
            return

        await ctx.send(
            transcript=transcript,
            continue_=continue_,
            **self.cartesia_kw,
        )

        self.log.info("Sending to cartesia: %s", transcript)

    async def _cartesia_send_stream(
        self,
        ctx,
        transcript: str,
        log_label: str,
        last_classify_spoken: list[str],
        *,
        continue_: bool = True,
    ) -> None:
        if not transcript.strip() or self.state.interrupt_event.is_set():
            self.log.info(
                "CARTESIA_SEND_SKIP | label=%s | empty=%s interrupt=%s",
                log_label,
                not transcript.strip(),
                self.state.interrupt_event.is_set(),
            )
            return
        import time as _time

        _t0 = _time.monotonic()
        await ctx.send(
            transcript=transcript,
            continue_=continue_,
            **self.cartesia_kw,
        )
        _send_ms = (_time.monotonic() - _t0) * 1000
        last_classify_spoken.append(transcript)
        self.log.info(
            "CARTESIA_SEND_OK | %.0fms | continue=%s | label=%s | text=%r",
            _send_ms,
            continue_,
            log_label,
            transcript if len(transcript) <= 200 else (transcript[:200] + "..."),
        )

    # -------------------------------
    # Stream LLM
    # -------------------------------

    async def stream_llm(self, user_text):
        st = self.state
        if not st.graph or not st.customer or not st.conversation:
            self.log.warning(
                "Skipping LLM: session not ready (graph/customer/conversation)."
            )
            self.log.warning(
                "PIPELINE_ABORT | stream_llm skipped | graph=%s customer=%s conversation=%s",
                st.graph is not None,
                st.customer is not None,
                st.conversation is not None,
            )
            return

        self.log.info(
            "PIPELINE_BEGIN | stream_llm | conversation_id=%s customer_id=%s | "
            "user_message_chars=%d",
            getattr(st.conversation, "id", None),
            getattr(st.customer, "id", None),
            len(user_text),
        )

        st.messages.append(HumanMessage(content=user_text))
        await self.message_service.create(
            conversation=st.conversation,
            content=user_text,
            role="user",
            db=self.db,
            tenant_id=self.tenant_id,
        )

        FORBIDDEN_WORDS = list(VOICE_FORBIDDEN_MARKERS)
        _TTS_MIN_CHARS = 30
        _TTS_FLUSH_CHARS = ".!?,;:\n"
        stream_buffer = ""
        tts_first_sent = False
        last_classify_spoken: list[str] = []
        ctx = self.connection.context()
        pump_task = asyncio.create_task(self.pump_cartesia(ctx))

        self.log.info(
            "GRAPH_ASYNC | starting graph.astream_events (order LangGraph, async stream, v2)"
        )

        try:
            async for ev in st.graph.astream_events(
                OrderState(
                    messages=st.messages,
                    user_input=user_text,
                    customer_name=st.customer.name,
                    customer_phone=st.customer.phone_number,
                ),
                config={
                    "callbacks": [langfuse_handler],
                    "configurable": {"thread_id": st.conversation.call_sid},
                },
                version="v2",
            ):
                ev_type = ev.get("event")
                meta = ev.get("metadata") or {}
                if ev_type == "on_custom_event":
                    raw = ev.get("data") or {}
                    chunk = raw.get("chunk", raw) if isinstance(raw, dict) else raw
                    if isinstance(raw, dict) and raw.get("type") == "order_mcp_tool":
                        chunk = raw
                    if (
                        isinstance(chunk, dict)
                        and chunk.get("type") == "order_mcp_tool"
                    ):
                        self.log.info(
                            "STREAM_WRITER_EVENT | tool=%s phase=%s",
                            chunk.get("tool"),
                            chunk.get("phase"),
                        )
                elif ev_type == "on_tool_start":
                    tname = str(ev.get("name") or "")
                    if tname in _ORDER_STREAM_TOOL_NAMES:
                        self.log.info("TOOL_LIFECYCLE | on_tool_start | tool=%s", tname)
                elif ev_type == "on_tool_end":
                    tname = str(ev.get("name") or "")
                    if tname in _ORDER_STREAM_TOOL_NAMES:
                        self.log.info("TOOL_LIFECYCLE | on_tool_end | tool=%s", tname)
                elif (
                    ev_type == "on_chat_model_stream"
                    and meta.get("langgraph_node") == "classify_intent"
                ):
                    ch = ev.get("data", {}).get("chunk")
                    if ch is None:
                        continue
                    delta = _stream_chunk_text(ch)
                    if not delta:
                        continue
                    self.log.info(
                        "LLM_STREAM_CHUNK | node=classify_intent | delta_chars=%d | text=%r",
                        len(delta),
                        delta if len(delta) <= 400 else (delta[:400] + "..."),
                    )
                    stream_buffer += delta
                    for word in FORBIDDEN_WORDS:
                        if word in stream_buffer:
                            match word:
                                case "**FINISH_CONVERSATION**":
                                    self.log.info(
                                        "Graph signaled to finish conversation"
                                    )
                                    st.stop_event.set()
                                case "**NEEDS_HUMAN_INTERVENTION**":
                                    self.log.info(
                                        "Graph signaled that human intervention is needed"
                                    )
                                    st.human_event.set()
                            stream_buffer = stream_buffer.replace(word, "")
                    is_partial_match = any(
                        word.startswith(stream_buffer.strip())
                        for word in FORBIDDEN_WORDS
                    )
                    if (
                        not is_partial_match
                        and stream_buffer
                        and not st.interrupt_event.is_set()
                    ):
                        buf_len = len(stream_buffer)
                        ends_at_boundary = (
                            stream_buffer[-1] in _TTS_FLUSH_CHARS
                            or stream_buffer[-1] == " "
                        )
                        should_flush = (
                            (buf_len >= _TTS_MIN_CHARS and ends_at_boundary)
                            or any(c in stream_buffer for c in _TTS_FLUSH_CHARS)
                            or (not tts_first_sent and buf_len >= 2)
                        )
                        if should_flush:
                            seg = stream_buffer
                            self.log.info(
                                "TTS_STREAM_SEGMENT | flushed to Cartesia | "
                                "chars=%d text=%r",
                                len(seg),
                                seg if len(seg) <= 500 else (seg[:500] + "..."),
                            )
                            if not tts_first_sent:
                                self.log.info(
                                    "yolo2 | first_text_sent_to_cartesia | chars=%d | text=%r",
                                    len(seg),
                                    seg if len(seg) <= 300 else (seg[:300] + "..."),
                                )
                            await self._cartesia_send_stream(
                                ctx,
                                stream_buffer,
                                "Sending to cartesia",
                                last_classify_spoken,
                            )
                            stream_buffer = ""
                            tts_first_sent = True

                elif ev_type == "on_chain_end" and ev.get("name") in (
                    "classify_intent",
                    "tools",
                ):
                    output = ev.get("data", {}).get("output")
                    self.log.info(
                        "Graph node finished: %s",
                        ev.get("name"),
                    )
                    if not isinstance(output, dict):
                        continue
                    self.log.info(
                        "GRAPH_NODE_END | node=%s | (async step complete; processing output messages)",
                        ev.get("name"),
                    )
                    if ev.get("name") == "tools":
                        self.log.info(
                            "GRAPH_NODE_END | tools node complete; continuing on same Cartesia context"
                        )
                    for m in output.get("messages", []):
                        st.messages.append(m)
                        if not isinstance(m, AIMessage):
                            continue
                        raw = m.content or ""
                        text = (
                            raw.strip()
                            if isinstance(raw, str)
                            else _stream_chunk_text(m).strip()
                        )
                        tcs = getattr(m, "tool_calls", None) or []
                        if (
                            ev.get("name") == "classify_intent"
                            and tcs
                            and not st.interrupt_event.is_set()
                            and not text.strip()
                            and not "".join(last_classify_spoken).strip()
                        ):
                            hold = _tool_hold_phrase(tcs)
                            self.log.info(
                                "TTS_TOOL_HOLD | n_tools=%d | phrase=%r",
                                len(tcs),
                                hold,
                            )
                            await self._cartesia_send_stream(
                                ctx,
                                hold,
                                "Sending to cartesia (tool hold)",
                                last_classify_spoken,
                                continue_=True,
                            )
                        if text and not tcs and not st.interrupt_event.is_set():
                            # Flush any pending streamed tail first (e.g. numeric suffix like "00")
                            # so coverage check compares against what was actually spoken.
                            if stream_buffer.strip():
                                for word in FORBIDDEN_WORDS:
                                    if word in stream_buffer:
                                        stream_buffer = stream_buffer.replace(word, "")
                                pending_tail = stream_buffer.strip()
                                if pending_tail:
                                    self.log.info(
                                        "TTS_BUFFER_FLUSH_PRE_COMPLETION | text=%r",
                                        (
                                            pending_tail
                                            if len(pending_tail) <= 500
                                            else (pending_tail[:500] + "...")
                                        ),
                                    )
                                    await self._cartesia_send_stream(
                                        ctx,
                                        pending_tail,
                                        "Sending to cartesia (pre-completion tail flush)",
                                        last_classify_spoken,
                                    )
                                stream_buffer = ""
                            spoken_j = "".join(last_classify_spoken)
                            if not _spoken_covers_final_classify(spoken_j, text):
                                s = spoken_j.strip()
                                t_st = text.strip()
                                if not s:
                                    to_send = t_st
                                elif t_st.startswith(s):
                                    to_send = t_st[len(s) :].lstrip()
                                else:
                                    to_send = t_st
                                for word in FORBIDDEN_WORDS:
                                    if word in to_send:
                                        match word:
                                            case "**FINISH_CONVERSATION**":
                                                st.stop_event.set()
                                            case "**NEEDS_HUMAN_INTERVENTION**":
                                                st.human_event.set()
                                        to_send = to_send.replace(word, "").strip()
                                if to_send:
                                    self.log.info(
                                        "TTS_COMPLETION_FALLBACK | text=%r",
                                        (
                                            to_send
                                            if len(to_send) <= 500
                                            else (to_send[:500] + "...")
                                        ),
                                    )
                                    await self._cartesia_send_stream(
                                        ctx,
                                        to_send,
                                        "Sending to cartesia (completion fallback)",
                                        last_classify_spoken,
                                    )
                        if not text or tcs:
                            continue
                        self.log.info("AI Said: %s", text)
                        clean = (
                            text.replace("**FINISH_CONVERSATION**", "")
                            .replace("**NEEDS_HUMAN_INTERVENTION**", "")
                            .strip()
                        )
                        self.log.info(
                            "ASSISTANT_FINAL_RESPONSE | stored_and_spoken=%r",
                            clean if len(clean) <= 2000 else (clean[:2000] + "..."),
                        )
                        m.content = clean
                        await self.message_service.create(
                            conversation=st.conversation,
                            content=m.content,
                            role="assistant",
                            db=self.db,
                            tenant_id=self.tenant_id,
                        )

            if stream_buffer.strip() and not st.interrupt_event.is_set():
                for word in FORBIDDEN_WORDS:
                    if word in stream_buffer:
                        stream_buffer = stream_buffer.replace(word, "")
                tail = stream_buffer.strip()
                if tail:
                    self.log.info(
                        "TTS_BUFFER_FLUSH | text=%r",
                        tail if len(tail) <= 500 else (tail[:500] + "..."),
                    )
                    await self._cartesia_send_stream(
                        ctx,
                        tail,
                        "Sending to cartesia (buffer flush)",
                        last_classify_spoken,
                    )

            self.log.info(
                "GRAPH_ASYNC | astream_events loop finished (turn processing complete)"
            )

            if not st.interrupt_event.is_set():
                try:
                    await ctx.send(
                        transcript="",
                        continue_=False,
                        **self.cartesia_kw,
                    )
                    self.log.info(
                        "CARTESIA | end-of-turn flush sent (empty transcript)"
                    )
                except Exception as e:
                    self.log.warning("CARTESIA | end-of-turn flush failed | %s", e)

            await pump_task
        finally:
            if not pump_task.done():
                pump_task.cancel()
                try:
                    await pump_task
                except asyncio.CancelledError:
                    pass
            try:
                await self.tts_queue.put(None)
            except Exception:
                pass
            self.log.info(
                "PIPELINE_END | stream_llm | Cartesia pump drained; sentinel queued to Twilio audio"
            )


class SendVoiceSession:

    def __init__(
        self,
        websocket,
        openai_stt,
        connection,
        state: OrderVoiceSessionState,
        conversation_service,
        customer_service,
        message_service,
        db,
        tenant_id,
        log,
        receive_session: "ReceiveVoiceSession | None" = None,
    ):
        self.websocket = websocket
        self.openai_stt = openai_stt
        self.connection = connection
        self.state = state
        self.conversation_service = conversation_service
        self.customer_service = customer_service
        self.message_service = message_service
        self.db = db
        self.tenant_id = tenant_id
        self.log = log
        self.receive_session = receive_session
        self.cartesia_kw = {
            "model_id": "sonic-3",
            "voice": {
                "id": "f786b574-daa5-4673-aa0c-cbe3e8534c02",
                "mode": "id",
            },
            "output_format": {
                "container": "raw",
                "encoding": "pcm_mulaw",
                "sample_rate": 8000,
            },
        }

    # ============================================================
    # TWILIO → OPENAI STT
    # ============================================================

    async def send_to_openai(self):

        while True:

            message = await self.websocket.receive_json()

            event_type = message.get("event")

            if event_type == "stop":
                break

            if event_type == "connected":
                await self.handle_connected(message)

            elif event_type == "start":
                await self.handle_start(message)

            elif event_type == "media":
                await self.handle_media(message)

            elif event_type == "mark":
                name = (message.get("mark") or {}).get("name") or ""
                if self.receive_session is not None:
                    self.receive_session.on_twilio_mark(name)

    async def handle_connected(self, message):

        self.log.info("WebSocket event: %s", message["event"])

    async def handle_start(self, message):

        self.log.info("WebSocket event: %s", message["event"])

        call_sid = message["start"]["callSid"]
        st = self.state

        st.conversation = await self.conversation_service.find_by_call_sid(
            call_sid,
            db=self.db,
            tenant_id=self.tenant_id,
        )

        if not st.conversation or st.conversation.status != "active":
            self.log.info("Conversation already ended")
            return

        if not st.conversation.customer_id:
            self.log.error(
                "Order voice: conversation %s has no customer_id",
                st.conversation.id,
            )
            return

        st.customer = await self.customer_service.find_by_id(
            st.conversation.customer_id,
            self.db,
            tenant_id=self.tenant_id,
        )
        if not st.customer:
            self.log.error(
                "Order voice: customer %s not found",
                st.conversation.customer_id,
            )
            return

        st.graph = await get_order_graph(
            call_sid,
            st.customer.phone_number or "",
            db=self.db,
            tenant_id=self.tenant_id,
            log=self.log,
        )

        st.stream_sid = message["start"]["streamSid"]

        await self.initialize_conversation_messages()
        await self.send_initial_greeting()
        self.log.info(
            "SESSION_READY | call_sid=%s | conversation_id=%s customer_id=%s | "
            "stream_sid=%s | order graph connected for MCP",
            call_sid,
            st.conversation.id,
            st.customer.id,
            st.stream_sid,
        )

    async def initialize_conversation_messages(self):

        st = self.state
        if st.customer.phone_number:
            st.messages.insert(
                0,
                HumanMessage(content=f"[Caller phone: {st.customer.phone_number}]"),
            )

        if st.customer.name:
            st.messages.insert(
                0,
                HumanMessage(content=f"[Caller: {st.customer.name}]"),
            )

    async def send_initial_greeting(self):
        st = self.state
        if not st.conversation or not st.customer or not st.stream_sid:
            self.log.warning(
                "Skipping initial order greeting: conversation=%s customer=%s stream_sid=%s",
                st.conversation is not None,
                st.customer is not None,
                bool(st.stream_sid),
            )
            return

        greeting_message = await _build_order_greeting_message(
            db=self.db,
            tenant_id=self.tenant_id,
            customer_name=st.customer.name,
        )
        st.messages.append(AIMessage(content=greeting_message))
        await self.message_service.create(
            conversation=st.conversation,
            content=greeting_message,
            role="assistant",
            db=self.db,
            tenant_id=self.tenant_id,
        )
        self.log.info("ORDER_GREETING | stored initial greeting=%r", greeting_message)

        ctx = self.connection.context()
        await ctx.send(
            transcript=greeting_message,
            continue_=False,
            **self.cartesia_kw,
        )

        if self.receive_session is not None:
            self.receive_session._reset_playback_tracker()

        first_chunk = True
        total_bytes = 0
        async for audio in _iter_cartesia_audio(ctx):
            if first_chunk:
                self.log.info(
                    "ORDER_GREETING | first audio chunk sent to Twilio | bytes=%d",
                    len(audio),
                )
                first_chunk = False
            total_bytes += len(audio)
            if self.receive_session is not None:
                self.receive_session._note_playback_chunk(len(audio))
            await self.websocket.send_json(
                {
                    "event": "media",
                    "streamSid": st.stream_sid,
                    "media": {"payload": base64.b64encode(audio).decode("utf-8")},
                }
            )
        self.log.info(
            "ORDER_GREETING | completed initial greeting playback | audio_bytes=%d",
            total_bytes,
        )
        if self.receive_session is not None:
            self.receive_session._start_silence_timer()

    async def handle_media(self, message):

        payload = message["media"]["payload"]

        await self.openai_stt.send(
            json.dumps(
                {
                    "type": "input_audio_buffer.append",
                    "audio": payload,
                }
            )
        )
