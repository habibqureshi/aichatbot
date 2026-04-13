from logging import Logger
from fastapi import (
    APIRouter,
    Request,
    Response,
    Depends,
    Form,
    HTTPException,
    WebSocket,
)
from langchain_openai import data
from twilio.twiml.voice_response import VoiceResponse
from db.db import get_db, AsyncSession
from fastapi.responses import StreamingResponse
from schemas.auth import TokenPayload
from schemas.twilio import (
    TwilioIncoming,
    parse_webhook,
    TwilioRecordingCallback,
    parse_twilio_recording,
)
from services import appointment_service, auth_service, conversation_service
import aiohttp
import urllib.parse
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
from utils.tenant_context import (
    TenantContext,
    get_tenant_context,
    get_tenant_context_ws,
)
from logger import get_logger, get_ws_logger
from langfuse import observe, propagate_attributes


router = APIRouter(prefix="/api/v1/appointment", tags=["appointment_workflow"])


@router.post("/ws/greeting")
async def ws_greeting(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    print(f"ws_greeting called")
    stream_url = str(req.url_for("openai_stream_ws"))
    stream_url = (
        f"{stream_url}"
        f"?CallSid={urllib.parse.quote_plus(data.CallSid)}"
        f"&From={urllib.parse.quote_plus(data.From)}"
        f"&To={urllib.parse.quote_plus(data.To)}"
    )
    resp = await appointment_service.ws_greeting(
        data=data,
        db=db,
        action_url=stream_url,
        tenant_id=tenant.tenant_id,
        log=log,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/receive")
async def receive_call(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    # log = get_logger(data.CallSid)
    log.info(f"call received")
    log.info(f"{data.CallSid} Received call from {data.From}")
    resp = await appointment_service.greeting(
        data=data,
        db=db,
        action_url=req.url_for("process_voice"),
        recording_status_callback=req.url_for("recording_status"),
        tenant_id=tenant.tenant_id,
        log=log,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.websocket("/ws/stream-call")
async def stream_call_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context_ws),
    log: Logger = Depends(get_ws_logger),
):
    await appointment_service.stream_call(
        websocket=websocket, db=db, tenant_id=tenant.tenant_id, log=log
    )


@router.websocket("/openai/stream")
async def openai_stream_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context_ws),
    log: Logger = Depends(get_ws_logger),
):
    log.info(f"twilio stream websocket started")
    await appointment_service.openai_stream(
        websocket=websocket, db=db, tenant_id=tenant.tenant_id, log=log
    )


@observe
@router.post("/process/voice")
async def process_voice(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    log.info(f"Processing voice")
    with propagate_attributes(tags=["callerID", data.CallSid], session_id=data.CallSid):
        resp = await appointment_service.process_speech(
            action_url=req.url_for("process_voice"),
            db=db,
            data=data,
            feedback_url=req.url_for("feedback"),
            tenant_id=tenant.tenant_id,
            log=log,
        )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/feedback")
async def feedback(
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    print(f"feedback {data.CallSid}")
    response = VoiceResponse()
    if data.Digits == "2":  # unsatisfied
        conversation = await conversation_service.find_by_call_sid(
            data.CallSid, db, tenant.tenant_id
        )
        if conversation:
            conversation.resolved_status = "unsatisfied"
            await db.commit()
        response.say("I'm sorry for not helping you out!", voice="Polly.Joanna-Neural")
    if data.Digits == "1":
        response.say("I'm very happy to help you out", voice="Polly.Joanna-Neural")
    response.hangup()
    return Response(content=str(response), media_type="application/xml")


@router.post("/status/change")
async def status_change(
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    log.info(f"Status change: {data}")
    await appointment_service.change_status(
        data=data, db=db, tenant_id=tenant.tenant_id, log=log
    )
    return {"message": "ok"}


@router.post("/recording/status")
async def recording_status(
    data: TwilioRecordingCallback = Depends(parse_twilio_recording),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    log.info(f"Recording url {data}")
    await conversation_service.update_recording_url(
        data.CallSid, data.RecordingUrl, db, tenant.tenant_id
    )
    return {"message": "ok"}


@router.get("/{conversation_id}/stream")
async def call_recording_stream(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(auth_service.get_current_user),
):
    conversation = await conversation_service.find_by_id(
        conversation_id, db, current_user.tenant_id
    )
    if conversation is None:
        raise HTTPException(status_code=400, detail="Conversation not found")
    if conversation.recording_link is None:
        raise HTTPException(status_code=400, detail="No recording available")
    media_url = f"{conversation.recording_link}.mp3"

    async def mp3_streamer():
        async with aiohttp.ClientSession(
            auth=aiohttp.BasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        ) as session:
            async with session.get(media_url) as resp:
                if resp.status != 200:
                    raise HTTPException(
                        status_code=resp.status, detail="Failed to fetch recording"
                    )
                async for chunk in resp.content.iter_chunked(1024):
                    yield chunk

    return StreamingResponse(mp3_streamer(), media_type="audio/mpeg")


# The `callerSid` is not required in the `/test/intent` endpoint.
# However, if you have it as a required parameter in your OpenAPI (Swagger) docs for some endpoints,
# it's likely because other endpoints depend on a call/caller session ID to link to a Twilio call/conversation.
# For `/test/intent`, you do NOT need `callerSid`.
# If Swagger shows `callerSid` as required for this endpoint, it's probably a copy-paste or schema issue;
# this endpoint only needs user input (or whatever parameters you define).
@observe
@router.post("/test/intent")
async def testintent(
    userInput: str,
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    log: Logger = Depends(get_logger),
):
    # Only use userInput for testing intent; callerSid is not required here.
    with propagate_attributes(tags=["callerID", "testing"], session_id="test"):

        intent = await appointment_service.test_intent(userInput, thread_id, log)
    return {"intent": intent}
