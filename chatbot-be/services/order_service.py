import asyncio
import base64
import datetime
import json
import logging
import os
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

from cartesia import AsyncCartesia

cartesia_client = AsyncCartesia(api_key=CARTESIA_API_KEY)
openai_client = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

SAMPLING_RATE = 8000
CHUNK_SIZE = 160
VAD_AGGRESSIVENESS = 3
SILENCE_THRESHOLD_MS = 500

# Initialize Langfuse client
langfuse = get_client()


# Initialize Langfuse CallbackHandler for Langchain (tracing)
langfuse_handler = CallbackHandler()


def _order_voice_app_log() -> logging.Logger:
    """Writes order voice pipeline traces to chatbot-be/app.log (not console-only ws logger)."""
    lg = logging.getLogger("order_service.order_voice_trace")
    if lg.handlers:
        return lg
    lg.setLevel(logging.INFO)
    _app_log_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "app.log")
    )
    fh = logging.FileHandler(_app_log_path, encoding="utf-8")
    fh.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    )
    lg.addHandler(fh)
    lg.propagate = False
    return lg


_OV_APP = _order_voice_app_log()


background_tasks = BackgroundTasks()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
# vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
# syn = SynthesisConfig(volume=0.7)
# whisper_model = whisper.load_model("small")
# voice = PiperVoice.load(
#     "/home/hammad/Documents/techbucks/custom-tts/en_US-lessac-medium.onnx"
# )
VOICE = "Polly.Joanna-Neural"


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
    return " ".join(s.split())


def _tool_hold_phrase(tool_calls: list) -> str:
    """Short voice line while MCP tools run (tool-only model turns have no streamed text)."""
    if not tool_calls:
        return "One moment, please."
    first = tool_calls[0]
    if isinstance(first, dict):
        name = str(first.get("name") or "")
    else:
        name = str(getattr(first, "name", "") or "")
    match name:
        case "list_menu":
            return "Let me pull up the menu for you."
        case "create_order":
            return "I'm setting up your order now. One moment."
        case "add_order_item":
            return "Adding that to your order."
        case "confirm_order":
            return "Confirming your order now."
        case "cancel_order":
            return "Updating your order."
        case "update_order_item" | "remove_order_item":
            return "Updating your order."
        case "get_order" | "price_order":
            return "Let me check your order."
        case "knowledge_retriever":
            return "Let me look that up for you."
        case _:
            return "One moment, please."


# Tools that call _emit_order_mcp_tool_stream in order_graph (stream_writer phases).
_MCP_STREAM_TOOL_NAMES = frozenset({"list_menu", "create_order"})


def _mcp_tool_stream_phase_phrase(tool: str | None, phase: str | None) -> str | None:
    """Extra voice lines aligned with stream_writer start/done for wrapped MCP tools.

    Delivered via on_tool_start/on_tool_end (and on_custom_event when surfaced);
    deduped so the caller is not heard twice.
    """
    if not tool or not phase or phase not in ("start", "done"):
        return None
    match (str(tool), str(phase)):
        case ("list_menu", "start"):
            return "Loading menu details."
        case ("list_menu", "done"):
            return "Menu's ready."
        case ("create_order", "start"):
            return "Starting your order."
        case ("create_order", "done"):
            return "Order draft is set."
        case _:
            return None


async def ws_greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: str,
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
_OPENAI_REALTIME_OPEN_TIMEOUT = float(
    os.getenv("OPENAI_REALTIME_OPEN_TIMEOUT", "60")
)
_OPENAI_REALTIME_CONNECT_RETRIES = int(os.getenv("OPENAI_REALTIME_CONNECT_RETRIES", "3"))


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
                log.info(
                    "OpenAI Realtime WebSocket connected on attempt %s", attempt
                )
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
                        "threshold": 0.4,
                        # Too low (e.g. 200) ends turns mid-sentence; speech looks "unheard" / wrong intent.
                        "silence_duration_ms": 650,
                        "prefix_padding_ms": 300,
                        "create_response": False,
                        "interrupt_response": False,
                    },
                    "input_audio_format": "g711_ulaw",
                    "input_audio_transcription": {
                        "model": "gpt-4o-mini-transcribe",
                        "language": "en",
                    },
                },
            }
        )
    )
    log.info("Connected to OpenAI STT WebSocket")
    _OV_APP.info(
        "SESSION | openai_stream | OpenAI STT connected; starting Cartesia + Twilio duplex"
    )
    try:
        async with cartesia_client.tts.websocket_connect() as connection:
            await websocket.accept()
            _OV_APP.info(
                "SESSION | WebSocket accepted; spawning receive (STT→graph) + send (Twilio→STT)"
            )

            await asyncio.gather(
                ReceiveVoiceSession(
                    websocket,
                    openai_stt,
                    connection,
                    state,
                    message_service,
                    db,
                    tenant_id,
                    log,
                ).receive_from_openai(),
                SendVoiceSession(
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
                ).send_to_openai(),
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
        _OV_APP.error(
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

            self.log.info(f"Received from OpenAI STT: {msg}")

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
            self.log.info("Ignoring transcript because session is ending.")
            return

        user_text = msg.get("transcript", "").strip()

        self.log.info(f"User said (final): {user_text}")
        _OV_APP.info("USER_FINAL_TRANSCRIPT | %s", user_text)

        if not user_text:
            return

        self.log.info("Starting TTS synthesis and streaming to Twilio")
        _OV_APP.info(
            "PIPELINE | run_full_ai_cycle scheduled (final transcript only; STT deltas not logged)"
        )

        self.state.interrupt_event.clear()

        asyncio.create_task(
            self.run_full_ai_cycle(user_text)
        )

    # -------------------------------
    # User Interrupt
    # -------------------------------

    async def handle_user_interrupt(self, msg):

        delta_text = msg.get("delta", "").strip()

        if not delta_text:
            return

        self.log.info(f"User speaking: '{delta_text}'. Silencing AI.")

        self.state.interrupt_event.set()

        await self.websocket.send_json({
            "event": "clear",
            "streamSid": self.state.stream_sid
        })

    # -------------------------------
    # Full AI Cycle
    # -------------------------------

    async def run_full_ai_cycle(self, user_text):
        _OV_APP.info(
            "RUN_FULL_AI_CYCLE | begin | tasks: stream_llm (graph+LLM async) + twilio_forwarder"
        )
        await asyncio.gather(
            self.stream_llm(user_text),
            self.twilio_forwarder(),
        )
        _OV_APP.info("RUN_FULL_AI_CYCLE | end | stream_llm and twilio_forwarder completed")

    # -------------------------------
    # Send Audio To Twilio
    # -------------------------------

    async def twilio_forwarder(self):

        while True:

            audio = await self.tts_queue.get()

            if audio is None:
                return

            if self.state.interrupt_event.is_set():
                continue

            await self.websocket.send_json({
                "event": "media",
                "streamSid": self.state.stream_sid,
                "media": {
                    "payload": base64.b64encode(audio).decode("utf-8")
                },
            })

            self.log.info("Audio chunk sent to Twilio")

    # -------------------------------
    # Receive Audio From Cartesia
    # -------------------------------

    async def pump_cartesia(self, ctx):

        try:

            async for response in ctx.receive():

                if response.type == "chunk" and response.audio:

                    if self.state.interrupt_event.is_set():
                        return

                    self.log.info(
                        f"chunk received from Cartesia TTS: {len(response.audio)} bytes"
                    )

                    await self.tts_queue.put(response.audio)

        except Exception as e:

            self.log.exception("Cartesia receive pump ended: %s", e)

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

        self.log.info(f"Sending to cartesia: {transcript}")

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
            return
        await ctx.send(
            transcript=transcript,
            continue_=continue_,
            **self.cartesia_kw,
        )
        last_classify_spoken.append(transcript)
        self.log.info("%s: %s", log_label, transcript)

    # -------------------------------
    # Restart Cartesia After Tools
    # -------------------------------

    async def rotate_cartesia_after_tools(self, ctx, pump_task):

        if self.state.interrupt_event.is_set():
            return ctx, pump_task

        await pump_task

        ctx = self.connection.context()

        pump_task = asyncio.create_task(
            self.pump_cartesia(ctx)
        )

        return ctx, pump_task

    # -------------------------------
    # Stream LLM
    # -------------------------------

    async def stream_llm(self, user_text):
        st = self.state
        if not st.graph or not st.customer or not st.conversation:
            self.log.warning(
                "Skipping LLM: session not ready (graph/customer/conversation)."
            )
            _OV_APP.warning(
                "PIPELINE_ABORT | stream_llm skipped | graph=%s customer=%s conversation=%s",
                st.graph is not None,
                st.customer is not None,
                st.conversation is not None,
            )
            return

        _OV_APP.info(
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

        FORBIDDEN_WORDS = [
            "**FINISH_CONVERSATION**",
            "**NEEDS_HUMAN_INTERVENTION**",
        ]
        stream_buffer = ""
        last_classify_spoken: list[str] = []
        mcp_progress_spoken: set[tuple[str, str]] = set()
        ctx = self.connection.context()
        pump_task = asyncio.create_task(self.pump_cartesia(ctx))

        _OV_APP.info(
            "GRAPH_ASYNC | starting graph.astream_events (order LangGraph, async stream, v2)"
        )

        async for ev in st.graph.astream_events(
            OrderState(
                messages=st.messages,
                user_input=user_text,
                customer_name=st.customer.name,
                customer_phone=st.customer.phone_number,
            ),
            config={"callbacks": [langfuse_handler]},
            version="v2",
        ):
            ev_type = ev.get("event")
            meta = ev.get("metadata") or {}
            if ev_type == "on_custom_event":
                raw = ev.get("data") or {}
                chunk = raw.get("chunk", raw) if isinstance(raw, dict) else raw
                if isinstance(raw, dict) and raw.get("type") == "order_mcp_tool":
                    chunk = raw
                if isinstance(chunk, dict) and chunk.get("type") == "order_mcp_tool":
                    tool = chunk.get("tool")
                    phase = chunk.get("phase")
                    _OV_APP.info(
                        "ORDER_MCP_TOOL_STREAM_WRITER | tool=%s phase=%s",
                        tool,
                        phase,
                    )
                    if (
                        not st.interrupt_event.is_set()
                        and isinstance(tool, str)
                        and isinstance(phase, str)
                    ):
                        key = (tool, phase)
                        phrase = _mcp_tool_stream_phase_phrase(tool, phase)
                        if phrase and key not in mcp_progress_spoken:
                            mcp_progress_spoken.add(key)
                            _OV_APP.info(
                                "TTS_MCP_STREAM_PHASE | source=custom_event | tool=%s "
                                "phase=%s | phrase=%r",
                                tool,
                                phase,
                                phrase,
                            )
                            await self._cartesia_send_stream(
                                ctx,
                                phrase,
                                "Sending to cartesia (mcp stream phase)",
                                last_classify_spoken,
                                continue_=True,
                            )
            elif ev_type == "on_tool_start":
                tname = str(ev.get("name") or "")
                if (
                    tname in _MCP_STREAM_TOOL_NAMES
                    and not st.interrupt_event.is_set()
                ):
                    key = (tname, "start")
                    phrase = _mcp_tool_stream_phase_phrase(tname, "start")
                    if phrase and key not in mcp_progress_spoken:
                        mcp_progress_spoken.add(key)
                        _OV_APP.info(
                            "TTS_MCP_STREAM_PHASE | source=on_tool_start | tool=%s "
                            "| phrase=%r",
                            tname,
                            phrase,
                        )
                        await self._cartesia_send_stream(
                            ctx,
                            phrase,
                            "Sending to cartesia (mcp stream phase)",
                            last_classify_spoken,
                            continue_=True,
                        )
            elif ev_type == "on_tool_end":
                tname = str(ev.get("name") or "")
                if (
                    tname in _MCP_STREAM_TOOL_NAMES
                    and not st.interrupt_event.is_set()
                ):
                    key = (tname, "done")
                    phrase = _mcp_tool_stream_phase_phrase(tname, "done")
                    if phrase and key not in mcp_progress_spoken:
                        mcp_progress_spoken.add(key)
                        _OV_APP.info(
                            "TTS_MCP_STREAM_PHASE | source=on_tool_end | tool=%s "
                            "| phrase=%r",
                            tname,
                            phrase,
                        )
                        await self._cartesia_send_stream(
                            ctx,
                            phrase,
                            "Sending to cartesia (mcp stream phase)",
                            last_classify_spoken,
                            continue_=True,
                        )
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
                _OV_APP.info(
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
                    seg = stream_buffer
                    _OV_APP.info(
                        "TTS_STREAM_SEGMENT | flushed streamed tokens to Cartesia | "
                        "chars=%d text=%r",
                        len(seg),
                        seg if len(seg) <= 500 else (seg[:500] + "..."),
                    )
                    await self._cartesia_send_stream(
                        ctx,
                        stream_buffer,
                        "Sending to cartesia",
                        last_classify_spoken,
                    )
                    stream_buffer = ""

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
                _OV_APP.info(
                    "GRAPH_NODE_END | node=%s | (async step complete; processing output messages)",
                    ev.get("name"),
                )
                if ev.get("name") == "tools":
                    _OV_APP.info(
                        "CARTESIA | rotate context after tools node (MCP tools finished)"
                    )
                    last_classify_spoken.clear()
                    ctx, pump_task = await self.rotate_cartesia_after_tools(
                        ctx, pump_task
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
                        _OV_APP.info(
                            "TTS_TOOL_HOLD | n_tools=%d | phrase=%r",
                            len(tcs),
                            hold,
                        )
                        await self._cartesia_send_stream(
                            ctx,
                            hold,
                            "Sending to cartesia (tool hold)",
                            last_classify_spoken,
                            continue_=False,
                        )
                    if text and not tcs and not st.interrupt_event.is_set():
                        spoken_j = "".join(last_classify_spoken)
                        if _norm_joined_tts(spoken_j) != _norm_joined_tts(text):
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
                                    to_send = (
                                        to_send.replace(word, "").strip()
                                    )
                            if to_send:
                                _OV_APP.info(
                                    "TTS_COMPLETION_FALLBACK | text=%r",
                                    to_send
                                    if len(to_send) <= 500
                                    else (to_send[:500] + "..."),
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
                    _OV_APP.info(
                        "ASSISTANT_FINAL_RESPONSE | stored_and_spoken=%r",
                        clean
                        if len(clean) <= 2000
                        else (clean[:2000] + "..."),
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
                _OV_APP.info(
                    "TTS_BUFFER_FLUSH | text=%r",
                    tail if len(tail) <= 500 else (tail[:500] + "..."),
                )
                await self._cartesia_send_stream(
                    ctx,
                    tail,
                    "Sending to cartesia (buffer flush)",
                    last_classify_spoken,
                )

        _OV_APP.info(
            "GRAPH_ASYNC | astream_events loop finished (turn processing complete)"
        )

        if not st.interrupt_event.is_set():
            try:
                await ctx.send(
                    transcript="",
                    continue_=False,
                    **self.cartesia_kw,
                )
                _OV_APP.info("CARTESIA | end-of-turn flush sent (empty transcript)")
            except Exception as e:
                self.log.warning("Cartesia end-of-turn flush: %s", e)
                _OV_APP.warning("CARTESIA | end-of-turn flush failed | %s", e)

        await pump_task
        await self.tts_queue.put(None)
        _OV_APP.info(
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

    async def handle_connected(self, message):

        self.log.info(f"WebSocket event: {message['event']}")

    async def handle_start(self, message):

        self.log.info(f"WebSocket event: {message['event']}")

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
        _OV_APP.info(
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
                HumanMessage(
                    content=f"[Caller phone: {st.customer.phone_number}]"
                ),
            )

        if st.customer.name:
            st.messages.insert(
                0,
                HumanMessage(content=f"[Caller: {st.customer.name}]"),
            )

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
