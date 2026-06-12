import urllib.parse
from logging import Logger

from fastapi import APIRouter, Depends, Request, Response, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.rest import Client

from db.db import AsyncSession, get_db
from logger import get_logger, get_ws_logger
from schemas.twilio import TwilioIncoming, parse_webhook
from services.voice import twilio_service, pipeline
from utils.tenant_context import (
    TenantContext,
    get_tenant_context,
    get_tenant_context_ws,
)
from utils.twilio_client import get_twilio_client

router = APIRouter(prefix="/api/v1/inbound", tags=["inbound_voice"])


@router.post("/greeting")
async def inbound_greeting(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    """Twilio webhook: returns TwiML that opens a bidirectional media stream."""
    stream_url = str(req.url_for("inbound_stream_ws"))
    stream_url = (
        f"{stream_url}"
        f"?CallSid={urllib.parse.quote_plus(data.CallSid)}"
        f"&From={urllib.parse.quote_plus(data.From)}"
        f"&To={urllib.parse.quote_plus(data.To)}"
    )
    resp = await twilio_service.greeting(
        data=data,
        db=db,
        action_url=stream_url,
        tenant_id=tenant.tenant_id,
        log=log,
        recording_status_callback=req.url_for("recording_status"),
    )
    return Response(content=str(resp), media_type="application/xml")


@router.websocket("/stream")
async def inbound_stream_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context_ws),
    log: Logger = Depends(get_ws_logger),
    twilio_client: Client = Depends(get_twilio_client),
):
    """WebSocket endpoint that bridges Twilio media ↔ OpenAI STT ↔ LLM graph ↔ Cartesia TTS."""
    log.info("Inbound Twilio stream WebSocket started")
    await pipeline.stream(
        websocket=websocket,
        db=db,
        tenant_id=tenant.tenant_id,
        log=log,
        twilio_client=twilio_client,
    )
