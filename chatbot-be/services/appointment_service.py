import datetime
import json
from logging import Logger
from fastapi.websockets import WebSocketState
from sqlalchemy import event
from twilio.twiml.voice_response import Connect, VoiceResponse, Start, Gather
from fastapi import (
    HTTPException,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
)
import websockets

# import audioop
import base64
import asyncio
import numpy as np
from langchain_openai import ChatOpenAI


# import webrtcvad
# import whisper
# from piper import PiperVoice, SynthesisConfig
from schemas.appointment import StreamState
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
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from graph.appointmnet_graph import AppointmentState
from twilio.rest import Client
from configs import OPENAI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, MCP_URL
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


async def ws_greeting(
    data: TwilioIncoming,
    db: AsyncSession,
    action_url: str,
    tenant_id: int,
):
    resp = VoiceResponse()
    patient = await patient_service.find_or_create(
        data.From, db=db, tenant_id=tenant_id
    )
    await conversation_service.find_or_create(
        data=data, patient=patient, db=db, tenant_id=tenant_id
    )
    connect = Connect()
    connect.stream(url=action_url)
    resp.append(connect)
    return resp


# async def stream_tts_audio(
#     websocket: WebSocket, state: StreamState, stream_sid: str, text: str, log: Logger
# ):
#     for chunk in voice.synthesize(text, syn_config=syn):
#         if state.is_interrupted:
#             log.info("TTS interrupted")
#             break
#         resampled, _ = audioop.ratecv(chunk.audio_int16_bytes, 2, 1, 22050, 8000, None)
#         mu_law = audioop.lin2ulaw(resampled, 2)
#         for i in range(0, len(mu_law), CHUNK_SIZE):
#             if state.is_interrupted:
#                 break
#             sub = mu_law[i : i + 160].ljust(160, b"\xff")
#             payload = base64.b64encode(sub).decode()
#             if websocket.client_state != WebSocketState.CONNECTED:
#                 return

#             await websocket.send_json(
#                 {
#                     "event": "media",
#                     "streamSid": stream_sid,
#                     "media": {"payload": payload},
#                 }
#             )
#             await asyncio.sleep(0.02)


# def extract_final_message(ai_response):
#     messages = ai_response.get("messages", [])
#     final = messages[-1].content if messages else ""

#     if not final:
#         return "We are facing technical issues. Please wait."

#     for tag in ["FINISH_CONVERSATION", "NEEDS_HUMAN_INTERVENTION"]:
#         if tag in final:
#             return final.replace(tag, "").strip()

#     return final


# async def process_ai_response(
#     state: StreamState,
#     websocket: WebSocket,
#     db: AsyncSession,
#     tenant_id: int,
#     user_text: str,
#     log: Logger,
# ):
#     state.is_interrupted = False
#     state.is_ai_responding = True
#     try:
#         await message_service.create(
#             conversation=state.conversation,
#             content=user_text,
#             role="user",
#             db=db,
#             tenant_id=tenant_id,
#         )
#         ai_response = await state.graph.ainvoke(
#             AppointmentState(
#                 messages=state.messages + [HumanMessage(content=user_text)],
#                 user_input=user_text,
#                 patient_phone=state.patient.phone_number,
#                 patient_name=state.patient.name,
#             )
#         )

#         final = extract_final_message(ai_response)

#         await stream_tts_audio(websocket, state.stream_sid, final, state, log)

#         state.messages += [
#             HumanMessage(content=user_text),
#             AIMessage(content=final),
#         ]

#         await message_service.create(
#             conversation=state.conversation,
#             content=final,
#             role="assistant",
#             db=db,
#             tenant_id=tenant_id,
#         )

#     except Exception:
#         log.exception("AI processing failed")
#     finally:
#         state.is_ai_responding = False


# async def handle_media_chunk(
#     data: dict,
#     state: StreamState,
#     websocket: WebSocket,
#     db: AsyncSession,
#     tenant_id: int,
#     log: Logger,
# ):
#     payload = base64.b64decode(data["media"]["payload"])

#     pcm = audioop.ulaw2lin(payload, 2)
#     pcm_16k, state.resample_state = audioop.ratecv(
#         pcm, 2, 1, 8000, 16000, state.resample_state
#     )

#     is_speech = False
#     try:
#         is_speech = vad.is_speech(pcm, 8000)
#     except Exception:
#         pass
#     if is_speech:
#         state.silence_counter = 0
#         state.audio_buffer.extend(pcm_16k)

#         if state.is_ai_responding:
#             state.interruption_speech_duration += 20
#             if state.interruption_speech_duration >= 300:
#                 state.is_interrupted = True
#                 state.is_ai_responding = False

#         state.is_speaking = True
#         return
#     if state.is_speaking:
#         state.silence_counter += 20
#         state.audio_buffer.extend(pcm_16k)

#     if state.silence_counter < SILENCE_THRESHOLD_MS:
#         return
#     state.is_speaking = False
#     state.is_ai_responding = True
#     audio = np.frombuffer(state.audio_buffer, dtype=np.int16).astype(np.float32)
#     audio = audio / 32768.0
#     result = await asyncio.to_thread(
#         whisper_model.transcribe, audio, language="en", fp16=False
#     )

#     text = result.get("text", "").strip()
#     state.audio_buffer.clear()
#     state.silence_counter = 0
#     if text:
#         if not state.processing_task or state.processing_task.done():
#             state.processing_task = asyncio.create_task(
#                 process_ai_response(state, websocket, db, tenant_id, log, text)
#             )

#     state.is_ai_responding = False


async def stream_call(
    websocket: WebSocket, db: AsyncSession, tenant_id: int, log: Logger
):
    await websocket.accept()
    # state = StreamState()
    # try:
    #     while not state.stop:
    #         data = await websocket.receive_json()
    #         event = data.get("event")
    #         if event == "connected":
    #             log.info(f"WebSocket event: {event}")
    #         elif event == "start":
    #             state.stream_sid = data["start"]["streamSid"]

    #             state.conversation = await conversation_service.find_by_call_sid(
    #                 data["start"]["callSid"], db=db, tenant_id=tenant_id
    #             )

    #             if not state.conversation or state.conversation.status != "active":
    #                 break

    #             state.patient = await patient_service.find_by_id(
    #                 state.conversation.patient_id, db, tenant_id=tenant_id
    #             )

    #             state.graph = await get_graph(
    #                 data["start"]["callSid"],
    #                 state.patient.phone_number,
    #                 db=db,
    #                 tenant_id=tenant_id,
    #                 log=log,
    #             )
    #         elif event == "media":
    #             await handle_media_chunk(data, state, websocket, db, tenant_id, log)

    #         elif event == "stop":
    #             if state.conversation:
    #                 await conversation_service.end(
    #                     conversation=state.conversation, db=db
    #                 )
    #             break

    #     if state.processing_task and not state.processing_task.done():
    #         await state.processing_task

    # except WebSocketDisconnect:
    #     log.info("Disconnected")

    # finally:
    #     if state.processing_task and not state.processing_task.done():
    #         state.processing_task.cancel()

    #     if websocket.client_state == WebSocketState.CONNECTED:
    #         await websocket.close()

    # stream_sid: str | None = None
    # audio_buffer = bytearray()
    # is_ai_responding = False
    # is_speaking = False
    # silence_counter = 0
    # messages: list[BaseMessage] = []
    # conversation = None
    # graph: CompiledStateGraph = None
    # patient = None
    # stop = False

    # resample_state = None
    # processing_task = None

    # async def handle_user_input(user_text: str):
    #     nonlocal is_ai_responding, messages, graph, conversation, patient, stop, is_interrupted
    #     is_stop = False
    #     is_interrupted = False
    #     try:
    #         await message_service.create(
    #             conversation=conversation,
    #             content=user_text,
    #             role="user",
    #             db=db,
    #             tenant_id=tenant_id,
    #         )
    #         ai_response = await graph.ainvoke(
    #             AppointmentState(
    #                 messages=messages + [HumanMessage(content=user_text)],
    #                 user_input=user_text,
    #                 patient_phone=patient.phone_number,
    #                 patient_name=patient.name,
    #             ),
    #         )
    #         ai_messages = ai_response.get("messages", [])
    #         final_message = ai_messages[-1].content if ai_messages else ""
    #         if not final_message:
    #             final_message = "Due to some technical issues, we are unable to process your request at the moment. Our representative will get in touch with you shortly."
    #             await conversation_service.needs_human(conversation=conversation, db=db)
    #             is_stop = True
    #         elif final_message.strip().endswith(
    #             "FINISH_CONVERSATION"
    #         ) or final_message.strip().endswith("**FINISH_CONVERSATION**"):
    #             final_message = (
    #                 final_message.replace("**FINISH_CONVERSATION**", "")
    #                 .replace("FINISH_CONVERSATION", "")
    #                 .strip()
    #             )
    #             if not final_message:
    #                 final_message = "Thank you for contacting us. Goodbye!"
    #             await conversation_service.end(conversation=conversation, db=db)
    #             is_stop = True
    #         elif final_message.strip().endswith(
    #             "NEEDS_HUMAN_INTERVENTION"
    #         ) or final_message.strip().endswith("**NEEDS_HUMAN_INTERVENTION**"):
    #             final_message = (
    #                 final_message.replace("**NEEDS_HUMAN_INTERVENTION**", "")
    #                 .replace("NEEDS_HUMAN_INTERVENTION", "")
    #                 .strip()
    #                 or "Our representative will get in touch with you shortly."
    #             )
    #             await conversation_service.needs_human(conversation=conversation, db=db)
    #             is_stop = True
    #         state = None
    #         for chunk in voice.synthesize(final_message, syn_config=syn):

    #             if is_interrupted:
    #                 log.info("AI response interrupted by user speech")
    #                 break
    #             resampled_chunk, state = audioop.ratecv(
    #                 chunk.audio_int16_bytes,
    #                 2,  # Sample width (16-bit)
    #                 1,  # Channels (Mono)
    #                 22050,
    #                 8000,
    #                 state,
    #             )
    #             # 3. Convert Linear PCM to Mu-law (Twilio Format)
    #             mu_law_chunk = audioop.lin2ulaw(resampled_chunk, 2)
    #             for i in range(0, len(mu_law_chunk), CHUNK_SIZE):
    #                 if is_interrupted:
    #                     log.info("AI response interrupted by user speech")
    #                     break
    #                 sub_chunk = mu_law_chunk[i : i + 160]
    #                 if len(sub_chunk) < 160:
    #                     sub_chunk = sub_chunk.ljust(160, b"\xff")

    #                 payload = base64.b64encode(sub_chunk).decode("utf-8")
    #                 if websocket.client_state != WebSocketState.CONNECTED:
    #                     return
    #                 await websocket.send_json(
    #                     {
    #                         "event": "media",
    #                         "streamSid": stream_sid,
    #                         "media": {"payload": payload},
    #                     }
    #                 )
    #                 await asyncio.sleep(0.02)
    #         messages.append(HumanMessage(content=user_text))
    #         messages.append(AIMessage(content=final_message))
    #         await message_service.create(
    #             conversation=conversation,
    #             content=final_message,
    #             role="assistant",
    #             db=db,
    #             tenant_id=tenant_id,
    #         )
    #         is_ai_responding = False
    #         stop = is_stop
    #     except WebSocketException as e:
    #         log.error(f"WebSocket error while handling user input: {e}")
    #     except WebSocketDisconnect:
    #         log.info("Client disconnected while handling user input")
    #     except Exception as e:
    #         log.exception(f"Error handling user input: {e}")
    #         is_ai_responding = False

    # try:
    #     is_interrupted = False
    #     interruption_speech_duration = 0
    #     INTERRUPTION_THRESHOLD_MS = 300
    #     while True:
    #         if stop:
    #             break
    #         data = await websocket.receive_json()
    #         event = data.get("event")
    #         match event:
    #             case "connected":
    #                 log.info(f"WebSocket event: {event}")
    #                 pass
    #             case "start":
    #                 stream_sid = data["start"]["streamSid"]
    #                 log.info(f"Stream started: {stream_sid}")
    #                 conversation = await conversation_service.find_by_call_sid(
    #                     data["start"]["callSid"], db=db, tenant_id=tenant_id
    #                 )
    #                 if not conversation or conversation.status != "active":
    #                     log.info("Conversation already ended")
    #                     break
    #                 patient = await patient_service.find_by_id(
    #                     conversation.patient_id, db, tenant_id=tenant_id
    #                 )
    #                 # history = await message_service.load_messages_by_conversation(
    #                 #     conversation=conversation, db=db, tenant_id=tenant_id
    #                 # )
    #                 # messages = [
    #                 #     (
    #                 #         HumanMessage(content=conv_message.content)
    #                 #         if conv_message.role == "user"
    #                 #         else AIMessage(content=conv_message.content)
    #                 #     )
    #                 #     for conv_message in history
    #                 # ]
    #                 if patient.phone_number:
    #                     messages.insert(
    #                         0,
    #                         HumanMessage(
    #                             content=f"[Caller phone: {patient.phone_number}]"
    #                         ),
    #                     )
    #                 if patient.name:
    #                     messages.insert(
    #                         0, HumanMessage(content=f"[Caller: {patient.name}]")
    #                     )
    #                 graph = await get_graph(
    #                     data["start"]["callSid"],
    #                     patient.phone_number,
    #                     db=db,
    #                     tenant_id=tenant_id,
    #                     log=log,
    #                 )
    #             case "media":
    #                 # if is_ai_responding:
    #                 #     continue
    #                 payload = data["media"]["payload"]
    #                 mu_law_chunk = base64.b64decode(payload)
    #                 pcm_chunk = audioop.ulaw2lin(mu_law_chunk, 2)
    #                 pcm_16k, resample_state = audioop.ratecv(
    #                     pcm_chunk,
    #                     2,
    #                     1,
    #                     8000,
    #                     16000,
    #                     resample_state,
    #                 )
    #                 # webrtcvad requires fixed 10/20/30ms PCM frames.
    #                 # Twilio inbound media at 8kHz gives stable 20ms frames here.
    #                 is_speech = False
    #                 try:
    #                     is_speech = vad.is_speech(pcm_chunk, 8000)
    #                 except Exception as e:
    #                     log.debug(f"VAD frame skipped due to processing error: {e}")

    #                 if is_speech:
    #                     if is_ai_responding:
    #                         interruption_speech_duration += 20
    #                         if (
    #                             interruption_speech_duration
    #                             >= INTERRUPTION_THRESHOLD_MS
    #                         ):
    #                             log.info(
    #                                 "User started speaking, interrupting AI response"
    #                             )
    #                             is_interrupted = True
    #                             is_ai_responding = False
    #                         else:
    #                             log.debug(
    #                                 f"User speech detected but not long enough to interrupt (duration={interruption_speech_duration}ms)"
    #                             )
    #                     if not is_speaking:
    #                         log.debug("Speech detected")
    #                         is_speaking = True
    #                     silence_counter = 0
    #                     audio_buffer.extend(pcm_16k)
    #                 else:
    #                     if is_ai_responding and interruption_speech_duration > 0:
    #                         log.debug(
    #                             f"Silence detected during AI response, resetting interruption counter (was {interruption_speech_duration}ms)"
    #                         )
    #                         interruption_speech_duration = 0
    #                     if is_speaking:
    #                         silence_counter += 20  # Each chunk is 20ms
    #                         audio_buffer.extend(pcm_16k)
    #                     if is_speaking and silence_counter >= SILENCE_THRESHOLD_MS:
    #                         is_ai_responding = True
    #                         is_speaking = False
    #                         log.info(
    #                             f"Silence detected. Processing buffer bytes: {len(audio_buffer)}"
    #                         )
    #                         silence_padding = np.zeros(int(16000 * 0.3), dtype=np.int16)
    #                         np_audio = np.concatenate(
    #                             [
    #                                 silence_padding,
    #                                 (
    #                                     np.frombuffer(
    #                                         audio_buffer, dtype=np.int16
    #                                     ).astype(np.float32)
    #                                 ),
    #                             ]
    #                         )
    #                         np_audio = np_audio.astype(np.float32) / 32768.0
    #                         result = await asyncio.to_thread(
    #                             whisper_model.transcribe,
    #                             np_audio,
    #                             language="en",
    #                             fp16=False,
    #                         )
    #                         user_said = result.get("text", "")
    #                         log.info(f"User said: {user_said}")
    #                         if user_said.strip():
    #                             if processing_task and not processing_task.done():
    #                                 log.warning(
    #                                     "Previous processing still running, skipping"
    #                                 )
    #                                 is_ai_responding = False
    #                             else:
    #                                 processing_task = asyncio.create_task(
    #                                     handle_user_input(user_said.strip())
    #                                 )
    #                         else:
    #                             is_ai_responding = False
    #                         audio_buffer.clear()
    #                         is_speaking = False
    #                         silence_counter = 0
    #             case "stop":
    #                 log.info("Stream stopped by client")
    #                 if conversation and conversation.status == "active":
    #                     await conversation_service.end(conversation=conversation, db=db)
    #                 break
    #     if processing_task and not processing_task.done():
    #         await processing_task
    #     if websocket.client_state == WebSocketState.CONNECTED:
    #         await websocket.close()
    # except WebSocketException as e:
    #     log.error(f"WebSocket error: {e}")
    # except WebSocketDisconnect:
    #     log.info("Client disconnected")
    # finally:
    #     # print(messages)
    #     if processing_task and not processing_task.done():
    #         processing_task.cancel()


OPENAI_URL = (
    "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17"
)

# AAI_WS_URL = (
#     "wss://streaming.assemblyai.com/v3/ws"
#     "?speech_model=whisper-rt"
#     "&encoding=pcm_mulaw"
#     "&sample_rate=8000"
#     f"&token=815e9d9e6fcd4fadb71232ae9487917a"
# )

# from deepgram import AsyncDeepgramClient
# from deepgram.core.events import EventType
# from deepgram.listen.v1.types import (
#     ListenV1Metadata,
#     ListenV1Results,
#     ListenV1SpeechStarted,
#     ListenV1UtteranceEnd,
# )
# from typing import Union

# ListenV1SocketClientResponse = Union[
#     ListenV1SpeechStarted, ListenV1UtteranceEnd, ListenV1Results, ListenV1Metadata
# ]
# client = AsyncDeepgramClient(api_key="b597138cde1dd803ddea85a48ea77e6b7fa933dc")
import logging

logging.basicConfig(level=logging.INFO, filename="app.log")


async def openai_stream(
    websocket: WebSocket, db: AsyncSession, tenant_id: int, log: Logger
):
    await websocket.accept()
    openai_stt = await websockets.connect(
        OPENAI_URL,
        additional_headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1",
        },
    )
    await openai_stt.send(
        json.dumps(
            {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "silence_duration_ms": 600,
                        "prefix_padding_ms": 300,
                        "create_response": False,
                        "interrupt_response": False,
                    },
                    "input_audio_format": "g711_ulaw",
                    "input_audio_transcription": {
                        "model": "gpt-4o-mini-transcribe",
                        "language": "en",
                    },
                },
            }
        )
    )

    async def receive_from_openai():
        while True:
            msg = await openai_stt.recv()
            msg = json.loads(msg)
            if (
                msg.get("type")
                == "conversation.item.input_audio_transcription.completed"
            ):
                user_text = msg.get("transcript", "")
                log.info(f"User said (final): {user_text}")
            if msg.get("type") == "conversation.item.input_audio_transcription.delta":
                user_text = msg.get("transcript", "")
                log.info(f"User said (interim): {msg}")

    async def send_to_openai():
        while True:
            message = await websocket.receive_json()
            if message["event"] == "stop":
                break
            elif message["event"] == "media":
                payload = message["media"]["payload"]
                await openai_stt.send(
                    json.dumps(
                        {
                            "type": "input_audio_buffer.append",
                            "audio": payload,
                        }
                    )
                )

    await asyncio.gather(receive_from_openai(), send_to_openai())

    # try:
    #     async with client.listen.v1.connect(
    #         model="nova-3",
    #         encoding="mulaw",
    #         sample_rate=8000,
    #         vad_events="true",
    #         interim_results="true",
    #         numerals="true",
    #         endpointing=600,
    #     ) as connection:

    #         def on_message(msg):
    #             log.info(f"Received message: {msg}")
    #             if isinstance(msg, ListenV1Results):
    #                 transcript = msg.channel.alternatives[0].transcript
    #                 log.info(f"Transcript: {transcript}")

    #         connection.on(EventType.MESSAGE, on_message)

    #         async def twilio_to_deepgram():
    #             while True:
    #                 message = await websocket.receive_json()
    #                 if message["event"] == "stop":
    #                     break
    #                 elif message["event"] == "media":
    #                     payload = message["media"]["payload"]
    #                     audio_data = base64.b64decode(payload)
    #                     await connection.send_media(audio_data)

    #         await asyncio.gather(twilio_to_deepgram(), connection.start_listening())
    # except WebSocketException as e:
    #     log.error(f"WebSocket error: {e}")
    # except WebSocketDisconnect:
    #     log.info("Client disconnected")
    # finally:
    #     if websocket.client_state == WebSocketState.CONNECTED:
    #         await websocket.close()
    # async with websockets.connect(AAI_WS_URL) as aai_ws:

    #     async def receive_from_aai():
    #         while True:
    #             message = await aai_ws.recv()
    #             log.info(f"Received from AAI: {message}")
    #             msg = json.loads(message)
    #             if msg.get("type") == "Turn":
    #                 log.info(f"Turn info: {msg}")
    #                 transcript = msg.get("transcript", "")
    #                 if transcript:
    #                     print(f"Transcript: {transcript}")
    #                     if msg.get("end_of_turn"):
    #                         print("--- End of Turn ---")

    #     MIN_BUFFER_SIZE = 800
    #     audio_buffer = bytearray()

    #     async def send_to_aai():
    #         nonlocal audio_buffer
    #         while True:
    #             message = await websocket.receive_json()
    #             if message["event"] == "media":
    #                 payload = message["media"]["payload"]
    #                 audio_buffer.extend(base64.b64decode(payload))
    #                 if len(audio_buffer) >= MIN_BUFFER_SIZE:
    #                     await aai_ws.send(audio_buffer)
    #                     audio_buffer.clear()
    #             elif message["event"] == "stop":
    #                 break

    #     await asyncio.gather(receive_from_aai(), send_to_aai())

    # stream_sid = None
    # current_turn_items = []
    # llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)

    # async with websockets.connect(
    #     OPENAI_URL,
    #     additional_headers={
    #         "Authorization": f"Bearer {OPENAI_API_KEY}",
    #         "OpenAI-Beta": "realtime=v1",
    #     },
    # ) as openai_ws:
    #     end_call_called = False
    #     await openai_ws.send(
    #         json.dumps(
    #             {
    #                 "type": "session.update",
    #                 "session": {
    #                     #                         "instructions": f"""
    #                     #     You are an inbound call assistant for a restaurant.
    #                     #         CORE RULES:
    #                     #         - Keep responses brief and conversational (this is a voice call)
    #                     #         - Collect missing info one at a time naturally before calling tools
    #                     #         - NEVER call the same tool twice for the same question
    #                     #         - NEVER invent information. User messages is your only source of truth about the caller and their needs.
    #                     #         - ALWAYS confirm details with the caller before taking any action
    #                     #         - After completing any action, ask if they need anything else
    #                     #         For questions about the business OR custom capabilities:
    #                     #         1. Call retriever with caller's query
    #                     #         2. Answer ONLY from retrieved info
    #                     #         3. If no info found: "I'm sorry, I don't have that information right now."
    #                     #         Current time: {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
    #                     # """,
    #                     "modalities": ["audio", "text"],
    #                     "turn_detection": {
    #                         "type": "server_vad",
    #                         "threshold": 0.5,
    #                         "silence_duration_ms": 600,
    #                         "prefix_padding_ms": 300,
    #                         "create_response": False,
    #                         "interrupt_response": False,
    #                     },
    #                     "input_audio_format": "g711_ulaw",
    #                     "output_audio_format": "g711_ulaw",
    #                     "input_audio_transcription": {
    #                         "model": "gpt-4o-mini-transcribe",
    #                         "language": "en",
    #                     },
    #                     "voice": "alloy",
    #                     # "tools": [
    #                     #     {
    #                     #         "type": "mcp",
    #                     #         "server_label": "restaurant",
    #                     #         "headers": {
    #                     #             "x-call-id": websocket.query_params.get(
    #                     #                 "CallSid", "WS_CALL"
    #                     #             ),
    #                     #             "x-patient-no": "+923054700536",
    #                     #             "x-tenant-id": str(tenant_id),
    #                     #         },
    #                     #         "allowed_tools": [
    #                     #             "knowledge_retriever",
    #                     #             "reserve_table",
    #                     #             "cancel_reservation",
    #                     #             "reschedule_reservation",
    #                     #             "find_available_tables",
    #                     #         ],
    #                     #         "require_approval": "never",
    #                     #         "server_url": MCP_URL,
    #                     #     },
    #                     #     {
    #                     #         "type": "function",
    #                     #         "name": "end_call",
    #                     #         "description": "if user wants to end the conversation or if the user query is resolved and he do not need anything else, call this function to end the call",
    #                     #         "parameters": {
    #                     #             "type": "object",
    #                     #             "properties": {
    #                     #                 "reason": {
    #                     #                     "type": "string",
    #                     #                     "description": "Reason for ending the call",
    #                     #                 }
    #                     #             },
    #                     #         },
    #                     #     },
    #                     # ],
    #                 },
    #             }
    #         )
    #     )

    #     # Trigger initial greeting
    #     await asyncio.sleep(0.1)
    #     # await openai_ws.send(
    #     #     json.dumps(
    #     #         {
    #     #             "type": "response.create",
    #     #             "response": {
    #     #                 "modalities": ["text", "audio"],
    #     #             },
    #     #         }
    #     #     )
    #     # )

    #     async def twilio_to_openai():
    #         nonlocal stream_sid
    #         while True:
    #             data = await websocket.receive_json()
    #             event = data.get("event")

    #             if event == "connected":
    #                 log.info("Twilio connected")
    #                 continue

    #             if event == "start":
    #                 stream_sid = data["start"]["streamSid"]
    #                 log.info(f"Stream started: {stream_sid}")
    #                 continue

    #             if event == "media":
    #                 payload = data["media"]["payload"]
    #                 # mulaw_bytes = base64.b64decode(payload_b64)
    #                 # pcm_bytes = audioop.ulaw2lin(mulaw_bytes, 2)
    #                 # pcm16_24k, _ = audioop.ratecv(pcm_bytes, 2, 1, 8000, 24000, None)
    #                 # log.info(
    #                 #     f"Received media chunk: {len(pcm16_24k)} bytes after resampling"
    #                 # )
    #                 await openai_ws.send(
    #                     json.dumps(
    #                         {
    #                             "type": "input_audio_buffer.append",
    #                             "audio": payload,
    #                         }
    #                     )
    #                 )
    #             elif event == "stop":
    #                 log.info("Stream stopped")
    #                 break

    #     async def openai_to_twilio():
    #         nonlocal stream_sid, end_call_called, current_turn_items
    #         while True:
    #             message = await openai_ws.recv()
    #             res = json.loads(message)
    #             log.info(f"Received OpenAI message: {res}")

    #             if res.get("type") == "response.audio.delta":
    #                 ulaw_openai = base64.b64decode(res["delta"])
    #                 # log.info(f"Received audio delta: {len(ulaw_openai)} bytes")
    #                 # pcm_8k, _ = audioop.ratecv(ulaw_openai, 2, 1, 24000, 8000, None)
    #                 # mulaw_bytes = audioop.lin2ulaw(pcm_8k, 2)
    #                 for i in range(0, len(ulaw_openai), 160):
    #                     sub_chunk = ulaw_openai[i : i + 160]
    #                     if len(sub_chunk) < 160:
    #                         sub_chunk = sub_chunk.ljust(160, b"\xff")
    #                     await websocket.send_json(
    #                         {
    #                             "event": "media",
    #                             "streamSid": stream_sid,
    #                             "media": {
    #                                 "payload": base64.b64encode(sub_chunk).decode(
    #                                     "utf-8"
    #                                 )
    #                             },
    #                         }
    #                     )
    #                 # await websocket.send_json(
    #                 #     {
    #                 #         "event": "media",
    #                 #         "streamSid": stream_sid,
    #                 #         "media": {"payload": res["delta"]},
    #                 #     }
    #                 # )
    #             if res.get("type") == "response.function_call_arguments.done":
    #                 if res.get("name") == "end_call":
    #                     log.info("OpenAI requested to end the call")
    #                     end_call_called = True
    #                     await openai_ws.close()
    #                     await websocket.send_json(
    #                         {
    #                             "event": "stop",
    #                             "streamSid": stream_sid,
    #                         }
    #                     )
    #             if res.get("type") == "response.mcp_call.completed":
    #                 await openai_ws.send(
    #                     json.dumps(
    #                         {
    #                             "type": "response.create",
    #                             "response": {
    #                                 "modalities": ["text", "audio"],
    #                             },
    #                         }
    #                     )
    #                 )
    #             if (
    #                 res.get("type")
    #                 == "conversation.item.input_audio_transcription.completed"
    #             ):
    #                 user_text = res.get("transcript", "")
    #                 log.info(f"User said (final): {user_text}")
    #                 if not user_text.strip():
    #                     log.warning("Received empty user text")
    #                     llm_resp = "Ask user to say again!"
    #                 else:
    #                     llm_resp = await llm.ainvoke(
    #                         [
    #                             HumanMessage(content=user_text),
    #                             SystemMessage(
    #                                 content=f"Talk with the user in a friendly manner."
    #                             ),
    #                         ]
    #                     )
    #                     llm_resp = llm_resp.content
    #                     log.info(f"LLM response: {llm_resp}")
    #                 await openai_ws.send(
    #                     json.dumps(
    #                         {
    #                             "type": "response.create",
    #                             "response": {
    #                                 "modalities": ["text", "audio"],
    #                                 "instructions": f"ACT AS TTS ONLY: {llm_resp}",
    #                             },
    #                         }
    #                     )
    #                 )

    #             if res.get("type") == "response.audio_transcript.done":
    #                 ai_text = res.get("transcript", "")
    #                 log.info(f"AI said (final): {ai_text}")
    #             if res.get("type") == "conversation.item.created":
    #                 current_turn_items.append(res.get("item", {}).get("id"))
    #             if res.get("type") == "response.done":
    #                 for item_id in current_turn_items:
    #                     await openai_ws.send(
    #                         json.dumps(
    #                             {
    #                                 "type": "conversation.item.delete",
    #                                 "item_id": item_id,
    #                             }
    #                         )
    #                     )
    #                 current_turn_items.clear()
    #             # if res.get("type") == "response.done" and end_call_called:
    #             #     log.info("Response complete after end_call, closing connections")
    #             #     await openai_ws.close()
    #             #     await websocket.send_json(
    #             #         {
    #             #             "event": "stop",
    #             #             "streamSid": stream_sid,
    #             #         }
    #             #     )
    #             #     break
    #             # if res.get("type") == "input_audio_buffer.transcribed.delta":
    #             #     user_text = res["delta"]
    #             #     print(f"User: {user_text}", flush=True)

    #     await asyncio.gather(twilio_to_openai(), openai_to_twilio())
