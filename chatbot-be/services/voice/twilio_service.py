import asyncio
import base64
import time
from logging import Logger
from fastapi import WebSocket, WebSocketDisconnect, WebSocketException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import URL
from twilio.rest import Client
from twilio.twiml.voice_response import Connect, Start, Stream, VoiceResponse

from configs import TWILIO_FORWARDING_NUMBER
from schemas.twilio import TwilioIncoming
from services import conversation_service, customer_service, message_service
from schemas.voice_session import OrderVoiceSessionState
from services.voice.constants import GRAPH_FUNC
from services.voice import greeting_service, cartesia_tts_service, llm_service
from langchain_core.messages import HumanMessage
from cartesia.resources.tts import AsyncTTSResourceConnection
from deepgram.listen.v2.socket_client import AsyncV2SocketClient


async def greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: str,
    recording_status_callback: URL,
    tenant_id: int,
    log: Logger,
) -> VoiceResponse:
    """Build the TwiML response that opens a bidirectional media stream to our WebSocket."""
    resp = VoiceResponse()
    log.info("Websocket greeting for %s", data.From)

    customer = await customer_service.find_or_create_by_phone(
        data.From, db=db, tenant_id=tenant_id
    )
    log.info(
        "customer found %s %s" % (customer.name, customer.id)
        if customer
        else "customer not found"
    )

    await conversation_service.find_or_create_for_customer(
        data=data, customer=customer, db=db, tenant_id=tenant_id
    )
    log.info("conversation created for %s", data.CallSid)

    start = Start()
    start.recording(
        recording_status_callback=recording_status_callback,
        track="both",
        channels="mono",
    )
    resp.append(start)

    stream = Stream(url=action_url)
    stream.parameter("CallSid", data.CallSid)
    stream.parameter("From", data.From)
    stream.parameter("To", data.To)
    connect = Connect()
    connect.append(stream)
    resp.append(connect)

    return resp


async def send_audio_chunk(websocket: WebSocket, stream_sid: str, audio: bytes) -> None:
    """Send a single audio chunk to the Twilio media stream."""
    await websocket.send_json(
        {
            "event": "media",
            "streamSid": stream_sid,
            "media": {"payload": base64.b64encode(audio).decode("utf-8")},
        }
    )


async def send_clear(websocket: WebSocket, stream_sid: str) -> None:
    """Tell Twilio to discard all buffered audio (used on user interrupt)."""
    await websocket.send_json({"event": "clear", "streamSid": stream_sid})


async def send_mark(websocket: WebSocket, stream_sid: str, mark_name: str) -> None:
    """Send a mark event; Twilio echoes it back after all preceding audio has played."""
    await websocket.send_json(
        {
            "event": "mark",
            "streamSid": stream_sid,
            "mark": {"name": mark_name},
        }
    )


async def start_receiving(
    websocket: WebSocket,
    state: OrderVoiceSessionState,
    log: Logger,
    db: AsyncSession,
    tenant_id: int,
    cartesia_tts: AsyncTTSResourceConnection,
    deepgram_stt: AsyncV2SocketClient,
) -> None:
    await websocket.accept()
    _media_fwd = 0
    _media_skip = 0
    _t_last_media_log = time.monotonic()
    while True:
        # if state.stop_event.is_set():
        #     break
        try:
            data = await websocket.receive_json()
        except (WebSocketDisconnect, WebSocketException):
            log.info("TWILIO_WS | WebSocket closed; exiting receive loop")
            break
        event = data.get("event")
        match (event):
            case "media":
                if not state.stop_event.is_set():
                    await deepgram_stt._send(
                        base64.b64decode(data.get("media", {}).get("payload", ""))
                    )
                    _media_fwd += 1
                else:
                    _media_skip += 1
                _now = time.monotonic()
                if _now - _t_last_media_log >= 5.0:
                    log.info(
                        "TWILIO_WS | media forwarded=%d skipped=%d",
                        _media_fwd,
                        _media_skip,
                    )
                    _t_last_media_log = _now
            case "start":
                _start = data.get("start", {})
                _params = _start.get("customParameters", {})
                state.call_sid = _params.get("CallSid") or _start.get("callSid")
                state.stream_sid = _start.get("streamSid")
                log.extra["callId"] = state.call_sid
                log.info(
                    "CALL | incoming | call_sid=%s | from=%s | to=%s",
                    state.call_sid,
                    _params.get("From", "unknown"),
                    _params.get("To", "unknown"),
                )
                state.conversation = await conversation_service.find_by_call_sid(
                    state.call_sid, db=db, tenant_id=tenant_id
                )
                if not state.conversation or state.conversation.status != "active":
                    log.info("Conversation already ended")
                    return
                if not state.conversation.customer_id:
                    log.warning(
                        "Conversation has no associated customer_id; unable to load context."
                    )
                    return
                _graph_func = GRAPH_FUNC.get(state.installed_for)
                if not _graph_func:
                    log.error(
                        "No graph function found for installed_for=%s",
                        state.installed_for,
                    )
                    return
                state.graph = await _graph_func(
                    call_id=state.call_sid,
                    customer_phone=state.conversation.customer.phone_number or "",
                    db=db,
                    tenant_id=tenant_id,
                    log=log,
                    customer_name=state.conversation.customer.name,
                )
                if state.conversation.customer.name:
                    state.messages.append(
                        HumanMessage(f"[Caller: {state.conversation.customer.name}]")
                    )
                if state.conversation.customer.phone_number:
                    state.messages.append(
                        HumanMessage(
                            f"[Caller phone: {state.conversation.customer.phone_number}]"
                        )
                    )
                greeting_message = await greeting_service.build_order_greeting_message(
                    db,
                    tenant_id=tenant_id,
                    customer_name=state.conversation.customer.name,
                )
                state.db_messages.append(
                    message_service.create_object(
                        conversation=state.conversation,
                        content=greeting_message,
                        role="assistant",
                        tenant_id=tenant_id,
                    )
                )
                log.info(
                    "CALL | session ready | call_sid=%s | customer=%s | installed_for=%s",
                    state.call_sid,
                    state.conversation.customer.name or "unknown",
                    state.installed_for,
                )
                asyncio.create_task(
                    cartesia_tts_service.synthesize_and_send(
                        cartesia_tts=cartesia_tts,
                        websocket=websocket,
                        message=greeting_message,
                        state=state,
                        log=log,
                    )
                )
            case "connected":
                log.info("Websocket connected")
            case "mark":
                log.info(data)
                mark_name = data.get("mark", {}).get("name")
                if mark_name == "playback_done":
                    state.playback_done_event.set()
                elif mark_name == "end_session":
                    log.info(
                        "TWILIO_WS | end_session mark received; closing receive loop"
                    )
                    break
            case "stop":
                log.info("TWILIO_WS | stop event received")
                break


# ---------------------------------------------------------------------------
# STT consumer — reads transcripts from stt_queue and drives per-utterance cycles
# ---------------------------------------------------------------------------


async def _wait_for_interrupt(event: asyncio.Event) -> None:
    await event.wait()


async def _end_call(
    state: OrderVoiceSessionState,
    log: Logger,
    db: AsyncSession,
) -> None:
    log.info("END_CALL | ending conversation %s", state.call_sid)
    try:
        await conversation_service.end(conversation=state.conversation, db=db)
    except Exception:
        log.exception("END_CALL | failed to update conversation status")


async def _transfer_to_human(
    state: OrderVoiceSessionState,
    log: Logger,
    twilio_client: Client,
    db: AsyncSession,
) -> None:
    log.info(
        "HUMAN_TRANSFER | transferring call %s to %s",
        state.call_sid,
        TWILIO_FORWARDING_NUMBER,
    )
    if state.call_sid and TWILIO_FORWARDING_NUMBER:
        try:
            vr = VoiceResponse()
            vr.dial(TWILIO_FORWARDING_NUMBER)
            await twilio_client.calls.get(state.call_sid).update_async(twiml=str(vr))
        except Exception:
            log.exception("HUMAN_TRANSFER | failed to update Twilio call")
    try:
        await conversation_service.needs_human(conversation=state.conversation, db=db)
    except Exception:
        log.exception("HUMAN_TRANSFER | failed to update conversation status")


async def stt_consumer(
    websocket: WebSocket,
    state: OrderVoiceSessionState,
    cartesia_tts: AsyncTTSResourceConnection,
    log: Logger,
    db: AsyncSession,
    tenant_id: int,
    twilio_client: Client,
) -> None:
    """Read transcripts from stt_queue and run one LLM→TTS voice cycle per utterance."""
    _turn = 0
    _t_response_done: float | None = None
    while not (state.stop_event.is_set() or state.human_event.is_set()):
        # Wait for the next user utterance (or give up after 2 minutes of silence)
        _t_wait_start = time.monotonic()
        log.info("CALL | waiting for next utterance (turn=%d)", _turn + 1)
        try:
            user_text = await asyncio.wait_for(state.stt_queue.get(), timeout=120.0)
        except asyncio.TimeoutError:
            log.warning("CALL | silence timeout — no speech in 120s")
            break
        _t_wait_elapsed = time.monotonic() - _t_wait_start
        if _t_response_done is not None:
            log.info(
                "CALL | user spoke after %.2fs since last response delivered",
                time.monotonic() - _t_response_done,
            )
        log.info("CALL | stt_queue wait elapsed=%.2fs", _t_wait_elapsed)

        _turn += 1
        t_turn = time.monotonic()

        # If the user interrupted a previous cycle, clear Twilio's audio buffer first
        if state.interrupt_event.is_set():
            log.info("CALL | [turn %d] barge-in — clearing audio buffer", _turn)
            await send_clear(websocket, state.stream_sid)
            state.interrupt_event.clear()

        log.info("CALL | [turn %d] user said: %r", _turn, user_text)

        ctx = cartesia_tts.context()

        tts_receive_task = asyncio.create_task(
            cartesia_tts_service.receive_tts_audio(
                ctx, state.tts_queue, state.interrupt_event, log
            )
        )
        forwarder_task = asyncio.create_task(
            cartesia_tts_service.twilio_forwarder(websocket, state, log)
        )
        llm_task = asyncio.create_task(
            llm_service.generate_response(user_text, state, ctx, tenant_id, log)
        )

        # Race LLM completion against user barge-in
        interrupt_watch = asyncio.create_task(
            _wait_for_interrupt(state.interrupt_event)
        )
        done, _ = await asyncio.wait(
            {llm_task, interrupt_watch}, return_when=asyncio.FIRST_COMPLETED
        )

        if interrupt_watch in done and not llm_task.done():
            # ── INTERRUPT PATH ─────────────────────────────────────────────
            log.info(
                "CALL | [turn %d] interrupted after %.2fs",
                _turn,
                time.monotonic() - t_turn,
            )
            llm_task.cancel()
            tts_receive_task.cancel()
            await send_clear(websocket, state.stream_sid)
            while not state.tts_queue.empty():
                try:
                    state.tts_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await state.tts_queue.put(None)  # unblock forwarder sentinel
            state.interrupt_event.clear()
            await asyncio.gather(
                llm_task, tts_receive_task, forwarder_task, return_exceptions=True
            )
            interrupt_watch.cancel()
        else:
            # ── NORMAL COMPLETION PATH ─────────────────────────────────────
            interrupt_watch.cancel()
            await tts_receive_task  # drain all Cartesia audio into queue
            await state.tts_queue.put(None)  # sentinel: tell forwarder we're done
            await forwarder_task  # all audio chunks sent to Twilio
            log.info(
                "CALL | [turn %d] response delivered | elapsed=%.2fs",
                _turn,
                time.monotonic() - t_turn,
            )
            _t_response_done = time.monotonic()

            if state.stop_event.is_set():
                log.info("CALL | ending call after turn %d", _turn)
                await send_mark(websocket, state.stream_sid, "playback_done")
                try:
                    await asyncio.wait_for(
                        state.playback_done_event.wait(), timeout=10.0
                    )
                except asyncio.TimeoutError:
                    log.warning("CALL | playback_done mark timed out")
                await _end_call(state, log, db)
                await send_mark(websocket, state.stream_sid, "end_session")
                break

            elif state.human_event.is_set():
                log.info("CALL | transferring to human after turn %d", _turn)
                await send_mark(websocket, state.stream_sid, "playback_done")
                try:
                    await asyncio.wait_for(
                        state.playback_done_event.wait(), timeout=10.0
                    )
                except asyncio.TimeoutError:
                    log.warning("CALL | playback_done mark timed out")
                await _transfer_to_human(state, log, twilio_client, db)
                await send_mark(websocket, state.stream_sid, "end_session")
                break

    log.info("CALL | stt_consumer exited | total_turns=%d", _turn)
