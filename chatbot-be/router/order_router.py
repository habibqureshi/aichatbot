from logging import Logger
from fastapi import APIRouter, Request, Response, Depends, WebSocket
from db.db import get_db, AsyncSession
from schemas.twilio import TwilioIncoming, parse_webhook
from services import order_service
import urllib.parse
from utils.tenant_context import TenantContext, get_tenant_context, get_tenant_context_ws
from logger import get_logger, get_ws_logger

router = APIRouter(prefix="/api/v1/order", tags=["order_voice"])


@router.post("/ws/greeting")
async def order_ws_greeting(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    stream_url = str(req.url_for("order_openai_stream_ws"))
    stream_url = (
        f"{stream_url}"
        f"?CallSid={urllib.parse.quote_plus(data.CallSid)}"
        f"&From={urllib.parse.quote_plus(data.From)}"
        f"&To={urllib.parse.quote_plus(data.To)}"
    )
    resp = await order_service.ws_greeting(
        data=data,
        db=db,
        action_url=stream_url,
        tenant_id=tenant.tenant_id,
        log=log,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.websocket("/openai/stream")
async def order_openai_stream_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context_ws),
    log: Logger = Depends(get_ws_logger),
):
    log.info("Order Twilio stream websocket started")
    await order_service.openai_stream(
        websocket=websocket, db=db, tenant_id=tenant.tenant_id, log=log
    )
