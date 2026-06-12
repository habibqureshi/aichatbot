import asyncio
import time
from collections.abc import AsyncIterator
from logging import Logger
import base64

from cartesia import AsyncCartesia
from cartesia.resources.tts import AsyncTTSResourceConnection
from fastapi.websockets import WebSocket
from schemas.voice_session import OrderVoiceSessionState
from configs import CARTESIA_API_KEY
from schemas.audio import CartesiaTTSConfig

cartesia_client = AsyncCartesia(api_key=CARTESIA_API_KEY)


async def iter_cartesia_audio(ctx) -> AsyncIterator[bytes]:
    """Yield raw audio bytes from a Cartesia TTS context."""
    async for response in ctx.receive():
        if response.type == "chunk" and response.audio:
            yield response.audio


def build_cartesia_kw(voice_id: str) -> dict:
    """Return the kwargs dict for Cartesia TTS send() calls for a given voice ID."""
    return CartesiaTTSConfig.for_voice_id(voice_id).to_kwargs()


async def receive_tts_audio(
    ctx,
    tts_queue: asyncio.Queue,
    interrupt_event: asyncio.Event,
    log: Logger,
) -> None:
    """Receive streaming audio chunks from a Cartesia TTS context into a queue.

    Stops early if interrupt_event is set (user started speaking).
    """
    _chunks = 0
    _bytes = 0
    t0 = time.monotonic()
    try:
        async for response in ctx.receive():
            if response.type == "chunk" and response.audio:
                if interrupt_event.is_set():
                    log.info("TTS | interrupted | chunks=%d bytes=%d", _chunks, _bytes)
                    return
                _chunks += 1
                _bytes += len(response.audio)
                if _chunks == 1:
                    log.info("TTS | first audio chunk | latency=%.2fs", time.monotonic() - t0)
                await tts_queue.put(response.audio)
    except Exception as e:
        log.exception("TTS | receive error: %s", e)
    finally:
        log.info(
            "TTS | done | chunks=%d bytes=%d elapsed=%.2fs",
            _chunks,
            _bytes,
            time.monotonic() - t0,
        )


async def twilio_forwarder(
    websocket: WebSocket,
    state: OrderVoiceSessionState,
    log: Logger,
) -> None:
    """Forward audio chunks from tts_queue to the Twilio media stream.

    Exits when it receives a None sentinel or when interrupt_event is set.
    """
    _sent = 0
    _bytes_sent = 0
    t0 = time.monotonic()
    while True:
        audio = await state.tts_queue.get()
        if audio is None:
            break
        if state.interrupt_event.is_set():
            while not state.tts_queue.empty():
                try:
                    state.tts_queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
            break
        _sent += 1
        _bytes_sent += len(audio)
        await websocket.send_json(
            {
                "event": "media",
                "streamSid": state.stream_sid,
                "media": {"payload": base64.b64encode(audio).decode("utf-8")},
            }
        )
    duration_est = _bytes_sent / 8000 if _bytes_sent else 0.0
    log.info(
        "AUDIO | sent %d chunks (%d bytes) to Twilio | est_playback=%.2fs | queue_flush=%.2fs",
        _sent,
        _bytes_sent,
        duration_est,
        time.monotonic() - t0,
    )


async def synthesize_and_send(
    cartesia_tts: AsyncTTSResourceConnection,
    websocket: WebSocket,
    message: str,
    state: OrderVoiceSessionState,
    log: Logger,
):
    log.info("TTS | greeting synthesis start")
    t0 = time.monotonic()
    ctx = cartesia_tts.context()
    await ctx.send(transcript=message, continue_=False, **state.cartesia_kw)
    _chunks = 0
    async for chunk in ctx.receive():
        if chunk.type == "chunk" and chunk.audio:
            if _chunks == 0:
                log.info("TTS | greeting first audio | latency=%.2fs", time.monotonic() - t0)
            _chunks += 1
            await websocket.send_json(
                {
                    "event": "media",
                    "streamSid": state.stream_sid,
                    "media": {"payload": base64.b64encode(chunk.audio).decode("utf-8")},
                }
            )
    log.info("TTS | greeting sent | chunks=%d elapsed=%.2fs", _chunks, time.monotonic() - t0)
