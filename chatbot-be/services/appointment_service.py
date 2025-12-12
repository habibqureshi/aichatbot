from twilio.twiml.voice_response import VoiceResponse, Start, Gather
from twilio.twiml.voice_response import Record
from fastapi import HTTPException, BackgroundTasks
from db.models import Appointment
from schemas.twilio import TwilioIncoming
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import URL
from services import (
    patient_service,
    conversation_service,
    message_service,
    app_setting_service,
)
from graph.bot_graph import get_graph
from langgraph.graph.state import CompiledStateGraph
from langchain_core.messages import HumanMessage
from graph.appointmnet_graph import AppointmentState
from twilio.rest import Client
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

background_tasks = BackgroundTasks()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


async def greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: URL,
    recording_status_callback: URL,
) -> VoiceResponse:
    resp = VoiceResponse()
    patient = await patient_service.find_or_create(data.From, db=db)
    conversation = await conversation_service.find_or_create(
        data=data, patient=patient, db=db
    )
    greeting_message_saved = await app_setting_service.get_app_setting_by_key(
        db=db, key="GREETING"
    )
    if greeting_message_saved and greeting_message_saved.value:
        greenting_message = greeting_message_saved.value
    else:
        greenting_message = "Hi! How i can help you today"
    message = await message_service.create(
        conversation=conversation,
        content=greenting_message,
        role="assistant",
        db=db,
    )
    start = Start()
    start.recording(
        recording_status_callback=recording_status_callback,
        track="both",
        channels="mono",
    )
    resp.append(start)
    gather = Gather(
        input="speech",
        action=action_url,
        method="POST",
        speech_timeout="auto",
        speech_model="phone_call",
        language="en-US",
    )
    gather.say(message.content)
    resp.append(gather)
    resp.say(
        "Sorry, I didn't catch that. Please call again or visit our website to manage your appointment."
    )
    resp.hangup()
    return resp


async def process_speech(
    data: TwilioIncoming, action_url: URL, db: AsyncSession, feedback_url: URL
) -> VoiceResponse:
    resp = VoiceResponse()
    if not data.SpeechResult:
        gather = Gather(
            input="speech",
            action=action_url,
            method="POST",
            speech_timeout="auto",
            speech_model="phone_call",
            language="en-US",
        )
        gather.say("Sorry, I did not catch that. Please say again!")
        resp.append(gather)
        return resp
    conversation = await conversation_service.find_by_call_sid(
        call_sid=data.CallSid, db=db
    )
    if not conversation:
        resp.say("Conversation not found!")
        resp.hangup()
        return resp
    if conversation.status != "active":
        resp.say("Conversation already ended!")
        resp.hangup()
        return resp
    patient = await patient_service.find_by_id(conversation.patient_id, db)
    lc_messages = (
        [HumanMessage(content=f"Patient name is {patient.name}")]
        if patient.name
        else []
    ) + [
        HumanMessage(content=conv_message.content)
        for conv_message in await message_service.load_messages_by_conversation(
            conversation=conversation, db=db
        )
    ]
    await message_service.create(
        conversation=conversation, content=data.SpeechResult, role="user", db=db
    )
    graph: CompiledStateGraph = await get_graph(data.CallSid, data.From, db)
    ai_response = await graph.ainvoke(
        AppointmentState(
            messages=lc_messages + [HumanMessage(content=data.SpeechResult)],
            user_input=data.SpeechResult,
            patient_phone=data.From,
        ),
    )
    final_message = ai_response.get("messages", [])[-1].content
    if not final_message:
        final_message = "Unfortunately we have to end the conversation"
        resp.say(final_message)
        resp.hangup()
        await conversation_service.end(conversation=conversation, db=db)
    elif final_message.strip().endswith(
        "FINISH_CONVERSATION"
    ) or final_message.strip().endswith("**FINISH_CONVERSATION**"):
        final_message = (
            final_message.replace("FINISH_CONVERSATION", "")
            .replace("**FINISH_CONVERSATION**", "")
            .strip()
        )
        resp.say(final_message)
        resp.pause(1)
        gather = Gather(
            input="dtmf",
            action=feedback_url,
            num_digits=1,
            method="POST",
            timeout=5,
            language="en-US",
        )
        gather.say(
            "Please rate your experience. Press 1 for satisfied or 2 for not satisfied."
        )
        resp.append(gather)
        resp.redirect(url=str(feedback_url), method="POST")
        await conversation_service.end(conversation=conversation, db=db)
    elif final_message.strip().endswith(
        "NEEDS_HUMAN_INTERVENTION"
    ) or final_message.strip().endswith("**NEEDS_HUMAN_INTERVENTION**"):
        final_message = (
            final_message.replace("NEEDS_HUMAN_INTERVENTION", "")
            .replace("**NEEDS_HUMAN_INTERVENTION**", "")
            .strip()
            or "Our representative will get in touch with you shortly."
        )
        resp.say(final_message)
        resp.hangup()
        await conversation_service.needs_human(conversation=conversation, db=db)
    else:
        gather = Gather(
            input="speech",
            action=action_url,
            method="POST",
            speech_timeout="auto",
            speech_model="phone_call",
            language="en-US",
        )
        gather.say(final_message.strip())
        resp.append(gather)
    await message_service.create(
        conversation=conversation, content=final_message, role="assistant", db=db
    )
    return resp


async def change_status(data: TwilioIncoming, db: AsyncSession):
    if data.CallStatus == "completed":
        conversation = await conversation_service.find_by_call_sid(
            call_sid=data.CallSid, db=db
        )
        if not conversation:
            raise HTTPException(status_code=400, detail="No conversation ongoing")
        if conversation.status == "active":
            await conversation_service.end(conversation=conversation, db=db)
