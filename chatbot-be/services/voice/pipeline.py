"""Twilio ↔ Deepgram STT ↔ LangGraph ↔ Cartesia TTS voice pipeline."""

import asyncio
import time
from logging import Logger

import websockets.exceptions
from deepgram import AsyncDeepgramClient
from deepgram.core.events import EventType
from deepgram.listen.v2 import ListenV2TurnInfo
from fastapi import WebSocket
from fastapi.websockets import WebSocketState
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.rest import Client
from schemas.voice_session import OrderVoiceSessionState
from services import app_setting_service
from configs import DEEPGRAM_API_KEY
from services.voice.cartesia_tts_service import cartesia_client
from services.voice import twilio_service

_deepgram_client = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)


async def stream(
    websocket: WebSocket,
    db: AsyncSession,
    tenant_id: int,
    log: Logger,
    twilio_client: Client,
) -> None:
    """Wire Twilio WS ↔ Deepgram STT ↔ LangGraph ↔ Cartesia TTS for one call."""
    installed_for = await app_setting_service.get_app_setting_by_key_value(
        db=db, key="INSTALLED_FOR", tenant_id=tenant_id
    )
    state = OrderVoiceSessionState(installed_for=installed_for or "clinic")

    async with _deepgram_client.listen.v2.connect(
        model="flux-general-en",
        encoding="mulaw",
        sample_rate=8000,
    ) as deepgram_stt:

        _t_last_turn_end: list[float] = [time.monotonic()]

        def _on_message(result) -> None:
            match result.type:
                case "Connected":
                    log.info("Deepgram: WS connected")
                case "TurnInfo":
                    try:
                        turn = ListenV2TurnInfo.model_validate(result.dict())
                    except Exception:
                        return
                    match turn.event:
                        case "StartOfTurn":
                            delta = time.monotonic() - _t_last_turn_end[0]
                            log.info(
                                "Deepgram: user start of turn | %.2fs since last turn end",
                                delta,
                            )
                            state.interrupt_event.set()
                        case "Update":
                            if turn.transcript:
                                log.info("Deepgram partial: %r", turn.transcript)
                        case "EndOfTurn":
                            if turn.transcript:
                                log.info("Deepgram end of turn: %r", turn.transcript)
                                state.stt_queue.put_nowait(turn.transcript)
                            _t_last_turn_end[0] = time.monotonic()

        deepgram_stt.on(EventType.MESSAGE, _on_message)
        deepgram_stt.on(EventType.OPEN, lambda _: log.info("Deepgram WS open"))
        deepgram_stt.on(
            EventType.ERROR, lambda e: log.error("Deepgram WS error: %s", e)
        )
        deepgram_stt.on(EventType.CLOSE, lambda _: log.info("Deepgram WS closed"))

        try:
            async with cartesia_client.tts.websocket_connect() as cartesia_ws:
                t_call_start = time.monotonic()
                log.info("CALL | pipeline started")

                listen_task = asyncio.create_task(deepgram_stt.start_listening())
                receiver_task = asyncio.create_task(
                    twilio_service.start_receiving(
                        websocket=websocket,
                        cartesia_tts=cartesia_ws,
                        deepgram_stt=deepgram_stt,
                        db=db,
                        log=log,
                        state=state,
                        tenant_id=tenant_id,
                    )
                )
                stt_task = asyncio.create_task(
                    twilio_service.stt_consumer(
                        websocket=websocket,
                        state=state,
                        cartesia_tts=cartesia_ws,
                        log=log,
                        db=db,
                        tenant_id=tenant_id,
                        twilio_client=twilio_client,
                    )
                )
                await asyncio.gather(receiver_task, stt_task, return_exceptions=True)
                listen_task.cancel()
                await asyncio.gather(listen_task, return_exceptions=True)
                log.info(
                    "CALL | pipeline ended | call_sid=%s | duration=%.1fs",
                    state.call_sid,
                    time.monotonic() - t_call_start,
                )
                log.info("state after %s", state.__dict__)
                log.info("%s", websocket.client_state)

        except websockets.exceptions.InvalidStatus as exc:
            resp = getattr(exc, "response", None)
            status = getattr(resp, "status_code", None) or getattr(resp, "status", None)
            hint = (
                "HTTP 402 = Payment Required: top up Cartesia credits and verify CARTESIA_API_KEY."
                if status == 402
                else "Check Cartesia status, API key, and account access."
            )
            log.error("Cartesia WS rejected (HTTP %s). %s | %s", status, hint, exc)

    # Graceful teardown outside the deepgram context
    try:
        log.info("closing deepgram again")
        await deepgram_stt.send_close_stream()
    except Exception:
        pass
    try:
        if websocket.client_state != WebSocketState.DISCONNECTED:
            log.info("closing websocket")
            await websocket.close(code=1000)
    except Exception:
        pass
