from fastapi import APIRouter, Request, Response, Depends, Form, HTTPException
from twilio.twiml.voice_response import VoiceResponse
from db.db import get_db, AsyncSession
from fastapi.responses import StreamingResponse
from schemas.twilio import TwilioIncoming, parse_webhook, TwilioRecordingCallback
from services import appointment_service, conversation_service
import aiohttp
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

router = APIRouter(prefix="/api/v1/appointment", tags=["appointment_workflow"])


@router.post("/receive")
async def receive_call(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
):
    resp = await appointment_service.greeting(
        data=data,
        db=db,
        action_url=req.url_for("process_voice"),
        recording_status_callback=req.url_for("recording_status"),
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/process/voice")
async def process_voice(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
):
    resp = await appointment_service.process_speech(
        action_url=req.url_for("process_voice"),
        db=db,
        data=data,
        feedback_url=req.url_for("feedback"),
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/feedback")
async def feedback(
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
):
    print(data)

    response = VoiceResponse()
    if data.Digits == "2":  # unsatisfied
        conversation = await conversation_service.find_by_call_sid(data.CallSid, db)
        if conversation:
            conversation.resolved_status = "unsatisfied"
            await db.commit()
        response.say("I'm sorry for not helping you out!")
    if data.Digits == "1":
        response.say("I'm very happy to help you out")
    response.hangup()
    return Response(content=str(response), media_type="application/xml")


@router.post("/status/change")
async def status_change(
    data: TwilioIncoming = Depends(parse_webhook), db: AsyncSession = Depends(get_db)
):
    print(data.model_dump())
    await appointment_service.change_status(data=data, db=db)
    return {"message": "ok"}


@router.post("/recording/status")
async def recording_status(
    data: TwilioRecordingCallback = Form(...),
    db: AsyncSession = Depends(get_db),
):
    await conversation_service.update_recording_url(data.CallSid, data.RecordingUrl, db)
    return {"message": "ok"}


@router.get("/{conversation_id}/stream")
async def call_recording_stream(
    conversation_id: int, db: AsyncSession = Depends(get_db)
):
    conversation = await conversation_service.find_by_id(conversation_id, db)
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
