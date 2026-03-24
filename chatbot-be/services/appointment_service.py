from logging import Logger
from fastapi.websockets import WebSocketState
from twilio.twiml.voice_response import Connect, VoiceResponse, Start, Gather
from fastapi import (
    HTTPException,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
)

# import audioop
# import base64
# import asyncio
# import numpy as np
# import webrtcvad
# import whisper
# from piper import PiperVoice, SynthesisConfig
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
from graph.intent_graph import voice_ai_graph
from langgraph.graph.state import CompiledStateGraph, RunnableConfig
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from graph.appointmnet_graph import AppointmentState
from twilio.rest import Client
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
from langfuse import get_client
from langfuse.langchain import CallbackHandler

SAMPLING_RATE = 8000
CHUNK_SIZE = 160
VAD_AGGRESSIVENESS = 3
SILENCE_THRESHOLD_MS = 500

# Initialize Langfuse client
langfuse = get_client()


# Initialize Langfuse CallbackHandler for Langchain (tracing)
langfuse_handler = CallbackHandler()


background_tasks = BackgroundTasks()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
# vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
# syn = SynthesisConfig(volume=0.7)
# whisper_model = whisper.load_model("small")
# voice = PiperVoice.load(
#     "/home/hammad/Documents/techbucks/custom-tts/en_US-lessac-medium.onnx"
# )
VOICE = "Polly.Joanna-Neural"


async def greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: URL,
    recording_status_callback: URL,
    tenant_id: int,
    log: Logger,
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
    greeting_message = (
        greeting_message_saved.value
        if (greeting_message_saved and greeting_message_saved.value)
        else "How i can help you today"
    )
    greeting_message = (
        f"Hi {patient.name} {greeting_message}"
        if patient.name
        else f"Hi, {greeting_message}"
    )
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
    log: Logger,
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
    lc_messages = [
        (
            HumanMessage(content=conv_message.content)
            if conv_message.role == "user"
            else AIMessage(content=conv_message.content)
        )
        for conv_message in await message_service.load_messages_by_conversation(
            conversation=conversation, db=db, tenant_id=tenant_id
        )
    ]
    if patient.phone_number:
        lc_messages.insert(
            0,
            HumanMessage(content=f"[Caller phone: {patient.phone_number}]"),
        )
    if patient.name:
        lc_messages.insert(
            0,
            HumanMessage(content=f"[Caller: {patient.name}]"),
        )
    log.info(f"{data.CallSid} user said: {data.SpeechResult}")
    await message_service.create(
        conversation=conversation,
        content=data.SpeechResult,
        role="user",
        db=db,
        tenant_id=tenant_id,
    )
    log.info(f"Getting graph")
    graph: CompiledStateGraph = await get_graph(
        data.CallSid, data.From, db, tenant_id, log
    )
    log.info(f"invoking graph")
    ai_response = await graph.ainvoke(
        AppointmentState(
            messages=lc_messages,
            user_input=data.SpeechResult,
            patient_phone=data.From,
            patient_name=patient.name,
        ),
        config={"callbacks": [langfuse_handler]},
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
        resp.redirect(url=str(action_url), method="POST")
    log.info(f"{data.CallSid} AI responded with: {final_message}")
    await message_service.create(
        conversation=conversation,
        content=final_message,
        role="assistant",
        db=db,
        tenant_id=tenant_id,
    )
    return resp


async def change_status(
    data: TwilioIncoming, db: AsyncSession, tenant_id: int, log: Logger
):
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


async def test_intent(user_input: str, thread_id: str, log: Logger) -> str:
    """
    Helper function to run the intent classification graph for a given user input.
    Returns the predicted intent label (the `next_agent` value from the graph state).
    """
    graph = await voice_ai_graph(log)
    log.info(f"user input {user_input}")

    # Pass a dict (NOT a Pydantic model) so we only update the keys we care about.
    # This prevents overwriting checkpointed fields like `next_agent` with None.
    state = {
        "user_input": user_input,
        "messages": [HumanMessage(content=user_input)],
    }
    config: RunnableConfig = {
        "callbacks": [langfuse_handler],
        "configurable": {"thread_id": thread_id},
    }
    result = await graph.ainvoke(state, config=config)
    log.info(f"1 Intent test for '{user_input}' -> {result}")

    # `result` is typically a dict-like state; we pull out the classified intent.
    intent = None
    if isinstance(result, dict):
        intent = result.get("next_agent")
    else:
        intent = getattr(result, "next_agent", None)
    log.info(f"2 Intent test for '{user_input}' -> {intent}")
    return result["messages"]


# async def ws_greeting(
#     data: TwilioIncoming,
#     db: AsyncSession,
#     action_url: URL,
#     recording_status_callback: URL,
#     tenant_id: int,
# ):
#     resp = VoiceResponse()
#     patient = await patient_service.find_or_create(
#         data.From, db=db, tenant_id=tenant_id
#     )
#     await conversation_service.find_or_create(
#         data=data, patient=patient, db=db, tenant_id=tenant_id
#     )
#     connect = Connect()
#     connect.stream(url=action_url)
#     resp.append(connect)
#     return resp


# async def stream_call(websocket: WebSocket, db: AsyncSession, tenant_id: int):
#     await websocket.accept()
#     stream_sid = None
#     audio_buffer = bytearray()
#     is_ai_responding = False
#     is_speaking = False
#     silence_counter = 0
#     messages: list[BaseMessage] = [
#         HumanMessage(content=f"[Caller phone: {patient.phone_number}]"),
#         HumanMessage(content=f"[Caller: {patient.name}]"),
#     ]
#     conversation = None
#     graph: CompiledStateGraph = None
#     patient = None
#     stop = False

#     async def handle_user_input(user_text: str, stream_sid: str):
#         nonlocal is_ai_responding, messages, graph, conversation, patient, db, tenant_id, stop
#         is_stop = False
#         try:
#             print(f"user input: {user_text}")
#             asyncio.create_task(
#                 message_service.create(
#                     conversation=conversation,
#                     content=user_text,
#                     role="user",
#                     db=db,
#                     tenant_id=tenant_id,
#                 )
#             )
#             ai_response = await graph.ainvoke(
#                 AppointmentState(
#                     messages=messages + [HumanMessage(content=user_text)],
#                     user_input=user_text,
#                     patient_phone=patient.phone_number,
#                 ),
#             )
#             final_message = ai_response.get("messages", [])[-1].content
#             print(f"AI response: {final_message}")
#             if not final_message:
#                 final_message = "Due to some technical issues, we are unable to process your request at the moment. Our representative will get in touch with you shortly."
#                 asyncio.create_task(
#                     conversation_service.needs_human(conversation=conversation, db=db)
#                 )
#                 is_stop = True
#             elif final_message.strip().endswith(
#                 "FINISH_CONVERSATION"
#             ) or final_message.strip().endswith("**FINISH_CONVERSATION**"):
#                 final_message = (
#                     final_message.replace("**FINISH_CONVERSATION**", "")
#                     .replace("FINISH_CONVERSATION", "")
#                     .strip()
#                 )
#                 if not final_message:
#                     final_message = "Thank you for contacting us. Goodbye!"
#                 asyncio.create_task(
#                     conversation_service.end(conversation=conversation, db=db)
#                 )
#                 is_stop = True
#             elif final_message.strip().endswith(
#                 "NEEDS_HUMAN_INTERVENTION"
#             ) or final_message.strip().endswith("**NEEDS_HUMAN_INTERVENTION**"):
#                 final_message = (
#                     final_message.replace("**NEEDS_HUMAN_INTERVENTION**", "")
#                     .replace("NEEDS_HUMAN_INTERVENTION", "")
#                     .strip()
#                     or "Our representative will get in touch with you shortly."
#                 )
#                 asyncio.create_task(
#                     conversation_service.needs_human(conversation=conversation, db=db)
#                 )
#                 is_stop = True
#             for chunk in voice.synthesize(final_message, syn_config=syn):
#                 resampled_chunk, _ = audioop.ratecv(
#                     chunk.audio_int16_bytes,
#                     2,  # Sample width (16-bit)
#                     1,  # Channels (Mono)
#                     22050,
#                     8000,
#                     None,
#                 )
#                 # 3. Convert Linear PCM to Mu-law (Twilio Format)
#                 mu_law_chunk = audioop.lin2ulaw(resampled_chunk, 2)
#                 for i in range(0, len(mu_law_chunk), CHUNK_SIZE):
#                     sub_chunk = mu_law_chunk[i : i + 160]
#                     if len(sub_chunk) < 160:
#                         sub_chunk = sub_chunk.ljust(160, b"\xff")

#                     payload = base64.b64encode(sub_chunk).decode("utf-8")
#                     if websocket.client_state != WebSocketState.CONNECTED:
#                         return
#                     await websocket.send_json(
#                         {
#                             "event": "media",
#                             "streamSid": stream_sid,
#                             "media": {"payload": payload},
#                         }
#                     )
#                     await asyncio.sleep(0.02)
#             messages.append(HumanMessage(content=user_text))
#             messages.append(AIMessage(content=final_message))
#             asyncio.create_task(
#                 message_service.create(
#                     conversation=conversation,
#                     content=final_message,
#                     role="assistant",
#                     db=db,
#                     tenant_id=tenant_id,
#                 )
#             )
#             is_ai_responding = False
#             stop = is_stop
#         except WebSocketException as e:
#             print(f"WebSocket error: {e}")
#         except WebSocketDisconnect:
#             print("Client disconnected")

#     try:
#         while True:
#             if stop:
#                 break
#             data = await websocket.receive_json()
#             event = data.get("event")
#             match event:
#                 case "connected":
#                     print(event)
#                     pass
#                 case "start":
#                     stream_sid = data["start"]["streamSid"]
#                     print(f"Stream started: {stream_sid}")
#                     conversation = await conversation_service.find_by_call_sid(
#                         data["start"]["callSid"], db=db, tenant_id=tenant_id
#                     )
#                     if not conversation or conversation.status != "active":
#                         print("conversation already ended")
#                         break
#                     patient = await patient_service.find_by_id(
#                         conversation.patient_id, db, tenant_id=tenant_id
#                     )
#                     graph = await get_graph(
#                         data["start"]["callSid"],
#                         patient.phone_number,
#                         db=db,
#                         tenant_id=tenant_id,
#                     )
#                 case "media":
#                     if is_ai_responding:
#                         continue
#                     payload = data["media"]["payload"]
#                     mu_law_chunk = base64.b64decode(payload)
#                     pcm_chunk = audioop.ulaw2lin(mu_law_chunk, 2)
#                     pcm_16k, _ = audioop.ratecv(
#                         pcm_chunk,
#                         2,
#                         1,
#                         8000,
#                         16000,
#                         None,
#                     )
#                     if vad.is_speech(pcm_chunk, 16000):
#                         if not is_speaking:
#                             print("Speech detected...")
#                             is_speaking = True
#                         silence_counter = 0
#                         audio_buffer.extend(pcm_16k)
#                     else:
#                         if is_speaking:
#                             silence_counter += 20  # Each chunk is 20ms
#                             audio_buffer.extend(pcm_16k)
#                         if is_speaking and silence_counter >= SILENCE_THRESHOLD_MS:
#                             is_ai_responding = True
#                             is_speaking = False
#                             print(
#                                 f"Silence detected. Processing... {len(audio_buffer)}"
#                             )
#                             np_audio = (
#                                 np.frombuffer(audio_buffer, dtype=np.int16).astype(
#                                     np.float32
#                                 )
#                                 / 32768.0
#                             )
#                             result = whisper_model.transcribe(
#                                 np_audio, language="en", fp16=False
#                             )
#                             user_said = result.get("text", "")
#                             if user_said.strip():
#                                 asyncio.create_task(
#                                     handle_user_input(user_said.strip(), stream_sid)
#                                 )
#                             else:
#                                 is_ai_responding = False
#                             audio_buffer.clear()
#                             is_speaking = False
#                             silence_counter = 0
#                 case "stop":
#                     print("Stream stopped by client")
#                     await conversation_service.end(conversation=conversation, db=db)
#                     break
#         await websocket.close()
#     except WebSocketException as e:
#         print(f"WebSocket error: {e}")
#     except WebSocketDisconnect:
#         print("Client disconnected")
#     finally:
#         # print(messages)
#         pass
