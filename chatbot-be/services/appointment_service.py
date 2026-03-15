from doctest import debug
from logging import Logger
from twilio.twiml.voice_response import VoiceResponse, Start, Gather
from twilio.twiml.voice_response import Record
from fastapi import HTTPException, BackgroundTasks
from db.models import Tenant
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
from langchain_core.messages import HumanMessage, SystemMessage
from graph.appointmnet_graph import AppointmentState
from twilio.rest import Client
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
from langfuse import get_client 
from langfuse.langchain import CallbackHandler
 
# Initialize Langfuse client
langfuse = get_client()


# Initialize Langfuse CallbackHandler for Langchain (tracing)
langfuse_handler  = CallbackHandler()


background_tasks = BackgroundTasks()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

VOICE = "Polly.Joanna-Neural"


async def greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: URL,
    recording_status_callback: URL,
    tenant_id: int,
    log:Logger
) -> VoiceResponse:
    resp = VoiceResponse()
    patient = await patient_service.find_or_create(
        data.From, db=db, tenant_id=tenant_id
    )
    log.info(
        f"Patient found {patient.name} {patient.id}"
        if patient
        else f"Patient not found"
    )
    log.info(f"finding conversation")
    conversation = await conversation_service.find_or_create(
        data=data, patient=patient, db=db, tenant_id=tenant_id
    )
    log.info(f"conversation id {conversation.id}")

    greeting_message_saved = await app_setting_service.get_app_setting_by_key(
        db=db, key="GREETING", tenant_id=tenant_id
    )
    
    # TODO: ADD variables for the greeting message
    greeting_message = greeting_message_saved.value if (greeting_message_saved and greeting_message_saved.value) else "How i can help you today"
    greeting_message = f"Hi {patient.name} {greeting_message}" if patient else f"Hi, {greeting_message}"
    log.info(f"greeting message ${greeting_message}")
  

    message = await message_service.create(
        conversation=conversation,
        content=greeting_message,
        tenant_id=tenant_id,
        role="assistant",
        db=db,
    )
    log.info(f"message added in db ${message.id}")

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
    gather.say(message.content, voice=VOICE)
    resp.append(gather)
    # Explanation:
    # The logic here is that after appending the <Gather> verb to 'resp', Twilio will wait for user input (speech input in this case).
    # If the user does not speak (i.e. no speech is detected within the timeout specified by speech_timeout="auto"),
    # Twilio moves on to the next verb(s) in the VoiceResponse after the Gather block completes.
    # Therefore, the following resp.say(...) will only be executed if the user did not provide speech input, or if there was a failure to detect input.
    # This acts as a fallback message for "no input" or "no speech detected" cases.
    log.info(f" user havent said anything call time out")
    resp.say(
        "Sorry, I didn't catch that. Please call again or visit our website to manage your appointment.",
        voice=VOICE,
    )
    resp.hangup()
    return resp

async def process_speech(
    data: TwilioIncoming,
    action_url: URL,
    db: AsyncSession,
    feedback_url: URL,
    tenant_id: int,
    log:Logger
) -> VoiceResponse:
    resp = VoiceResponse()
    if not data.SpeechResult:
        gather = Gather(
            input="speech",
            action=action_url,
            method="POST",
            speech_timeout=60,
            speech_model="phone_call",
            language="en-US",
        )
        gather.say("Sorry, I did not catch that. Please say again!", voice=VOICE)
        resp.append(gather)
        return resp
    conversation = await conversation_service.find_by_call_sid(
        call_sid=data.CallSid, db=db, tenant_id=tenant_id
    )
    if not conversation or conversation.status != "active":
        resp.say(
            "It looks like you are at the wrong place.",
            voice=VOICE,
        )
        resp.hangup()
        return resp
    patient = await patient_service.find_by_id(
        conversation.patient_id, db, tenant_id=tenant_id
    )
    lc_messages = (
        [SystemMessage(content=f"Caller name is {patient.name}")] if patient.name else []
    ) + [
        HumanMessage(content=conv_message.content)
        for conv_message in await message_service.load_messages_by_conversation(
            conversation=conversation, db=db, tenant_id=tenant_id
        )
    ]
    log.info(f"{data.CallSid} user said: {data.SpeechResult}")
    await message_service.create(
        conversation=conversation,
        content=data.SpeechResult,
        role="user",
        db=db,
        tenant_id=tenant_id,
    )
    log.info(f"Getting graph")
    graph: CompiledStateGraph = await get_graph(data.CallSid, data.From, db, tenant_id, log)
    log.info(f"invoking graph")
    ai_response = await graph.ainvoke(
        AppointmentState(
            messages=lc_messages + [HumanMessage(content=data.SpeechResult)],
            user_input=data.SpeechResult,
            patient_phone=data.From,
            patient_name=patient.name

        ),
        config={"callbacks": [langfuse_handler]}
    )
    final_message = ai_response.get("messages", [])[-1].content
    log.info(f"AI responded with: {final_message}")
    if not final_message:
        final_message = "Due to some technical issues, we are unable to process your request at the moment. Our representative will get in touch with you shortly."
        resp.say(final_message, voice=VOICE)
        resp.hangup()
        await conversation_service.needs_human(conversation=conversation, db=db)
    elif final_message.strip().endswith(
        "FINISH_CONVERSATION"
    ) or final_message.strip().endswith("**FINISH_CONVERSATION**"):
        final_message = (
            final_message.replace("**FINISH_CONVERSATION**", "")
            .replace("FINISH_CONVERSATION", "")
            .strip()
        )
        if not final_message:
            final_message = "Thank you for contacting us. Goodbye!"
        resp.say(
            final_message,
            voice=VOICE,
        )
        gather = Gather(
            input="dtmf",
            action=feedback_url,
            num_digits=1,
            method="POST",
            timeout=5,
            language="en-US",
        )
        gather.say(
            "Please rate your experience. Press 1 if you were satisfied. Or press 2 if you were not satisfied.",
            voice=VOICE,
        )
        resp.append(gather)
        resp.redirect(url=str(feedback_url), method="POST")
        await conversation_service.end(conversation=conversation, db=db)
    elif final_message.strip().endswith(
        "NEEDS_HUMAN_INTERVENTION"
    ) or final_message.strip().endswith("**NEEDS_HUMAN_INTERVENTION**"):
        final_message = (
            final_message.replace("**NEEDS_HUMAN_INTERVENTION**", "")
            .replace("NEEDS_HUMAN_INTERVENTION", "")
            .strip()
            or "Our representative will get in touch with you shortly."
        )
        resp.say(final_message, voice=VOICE)
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
        gather.say(final_message.strip(), voice=VOICE)
        resp.append(gather)
    log.info(f"{data.CallSid} AI responded with: {final_message}")
    await message_service.create(
        conversation=conversation,
        content=final_message,
        role="assistant",
        db=db,
        tenant_id=tenant_id,
    )
    return resp


async def change_status(data: TwilioIncoming, db: AsyncSession, tenant_id: int, log:Logger):
    if data.CallStatus == "completed":
        conversation = await conversation_service.find_by_call_sid(
            call_sid=data.CallSid, db=db, tenant_id=tenant_id
        )
        log.info(f"Conversation found: {conversation}")
        if not conversation:
            raise HTTPException(status_code=400, detail="No conversation ongoing")
        if conversation.status == "active":
            await conversation_service.end(conversation=conversation, db=db)
            log.info(f"Conversation ended: {conversation}")