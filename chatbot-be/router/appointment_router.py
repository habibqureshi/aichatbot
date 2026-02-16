from fastapi import (
    APIRouter,
    Request,
    Response,
    Depends,
    Form,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
)
from starlette.websockets import WebSocketState
import asyncio
from twilio.twiml.voice_response import VoiceResponse, Connect
from db.db import get_db, AsyncSession
from fastapi.responses import StreamingResponse
from schemas.auth import TokenPayload
from schemas.twilio import TwilioIncoming, parse_webhook, TwilioRecordingCallback
from services import appointment_service, auth_service, conversation_service
import aiohttp
from configs import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
from utils.tenant_context import (
    TenantContext,
    get_tenant_context,
    get_tenant_context_from_ws,
)
import base64
import audioop
import wave
import json
import uuid
from io import BytesIO
from openai import OpenAI
from collections import deque
from datetime import datetime
import webrtcvad
import whisper
import numpy as np
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage, AIMessage
from kokoro import KPipeline
from vosk import Model, KaldiRecognizer
from piper import PiperVoice, SynthesisConfig

syn = SynthesisConfig(volume=0.7, normalize_audio=False)
# --- CONFIGURATION ---
SAMPLING_RATE = 8000
CHUNK_SIZE = 160  # Twilio's 20ms chunks (mu-law)
VAD_AGGRESSIVENESS = 3  # 0 to 3
SILENCE_THRESHOLD_MS = 500  # How long to wait before triggering LLM
VOSK_MODEL_PATH = "/home/hammad/.cache/vosk/vosk-model-small-en-us-0.15"

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model = Model(VOSK_MODEL_PATH)

# Initialize VAD
vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
whisper_model = whisper.load_model("small")
# pipeline = KPipeline(lang_code="a")
voice = PiperVoice.load(
    "/home/hammad/Documents/techbucks/custom-tts/en_US-lessac-medium.onnx"
)

router = APIRouter(prefix="/api/v1/appointment", tags=["appointment_workflow"])

openai_client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")
import logging


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context_from_ws),
):
    await appointment_service.stream_call(websocket, db=db, tenant_id=tenant.tenant_id)
    # await websocket.accept()
    # audio_file = open("call_audio.ulaw", "ab")
    # pcm_frames = []
    # stream_sid = None

    # vad = webrtcvad.Vad(3)
    # is_speaking = False
    # silence_start = None
    # SILENCE_THRESHOLD = 0.5
    # speech_chunks = []
    # SILENCE_PADDING = 0.3
    # is_ai_speaking = True

    # async def send_ai_audio(text: str, websocket: WebSocket, stream_sid):
    #     nonlocal is_ai_speaking
    #     try:
    #         is_ai_speaking = True
    #         logging.info(f"Speaking {text}")
    #         for gs, ps, audio in pipeline(text=text, voice="af_heart"):
    #             print(gs, ps)
    #             audio_int16 = (audio * 32767).astype(np.int16)
    #             yield audio_int16.tobytes()
    #     except:
    #         pass

    # # async def send_ai_audio(text: str, websocket: WebSocket, stream_sid):
    # #     nonlocal is_ai_speaking
    # #     try:
    # #         is_ai_speaking = True
    # #         logging.info(f"Speaking {text}")
    # #         with openai_client.audio.speech.with_streaming_response.create(
    # #             model="kokoro",
    # #             voice="af_sky(0.6)+af_bella(0.4)",
    # #             input=text,
    # #             response_format="pcm",
    # #         ) as response:
    # #             for chunk in response.iter_bytes(chunk_size=160):
    # #                 if not chunk:
    # #                     continue
    # #                 resampled_pcm, _ = audioop.ratecv(chunk, 2, 1, 24000, 8000, None)
    # #                 ulaw_data = audioop.lin2ulaw(resampled_pcm, 2)
    # #                 payload = base64.b64encode(ulaw_data).decode()
    # #                 await websocket.send_json(
    # #                     {
    # #                         "event": "media",
    # #                         "streamSid": stream_sid,
    # #                         "media": {"payload": payload},
    # #                     }
    # #                 )
    # #         is_ai_speaking = False
    # #         logging.info("AI finished speaking")
    # #     except Exception as e:
    # #         is_ai_speaking = False
    # #         logging.info(f"Error sending AI audio: {e}")

    # def truncate_silence(frames, sample_rate=8000, frame_duration_ms=10):
    #     """Remove leading/trailing silence, keep only padding"""
    #     if not frames:
    # #         websocket_endpointreturn []

    # #     frames_per_second = 1000 / frame_duration_ms
    # #     padding_frames = int(SILENCE_PADDING * frames_per_second)

    # #     first_speech = None
    # #     last_speech = None

    # #     for i, frame in enumerate(frames):
    # #         if first_speech is None:
    # #             first_speech = i
    # #         last_speech = i

    # #     if first_speech is None:
    # #         return []

    # #     start_idx = max(0, first_speech - padding_frames)
    # #     end_idx = min(len(frames), last_speech + padding_frames + 1)

    # #     truncated = [frame for frame in frames[start_idx:end_idx]]

    # #     logging.info(f"Truncated: {len(frames)} -> {len(truncated)} frames")

    # #     return truncated

    # # async def process_speech(audio_data):
    # #     """Process collected speech and send to STT"""
    # #     try:
    # #         # Combine all speech chunks
    # #         logging.info(f"len {len(audio_data)}")
    # #         # audio_data = truncate_silence(audio_data)
    # #         if len(audio_data) == 0:
    # #             logging.info("No speech detected after truncation")
    # #             return None
    # #         full_audio = b"".join(audio_data)

    # #         # Convert μ-law to PCM for STT
    # #         pcm_audio = audioop.ulaw2lin(full_audio, 2)
    # #         resampled_pcm, _ = audioop.ratecv(pcm_audio, 2, 1, 8000, 16000, None)

    # #         audio_array = (
    # #             np.frombuffer(resampled_pcm, dtype=np.int16).astype(np.float32)
    # #             / 32768.0
    # #         )
    # #         logging.info("Transcribing user speech with Whisper...")
    # #         result = await asyncio.to_thread(
    # #             whisper_model.transcribe, audio_array, language="en", fp16=False
    # #         )
    # #         user_text = result["text"].strip()
    # #         logging.info(f"User said: {user_text} {len(user_text)}")
    # #         return user_text

    # #     except Exception as e:
    # #         logging.info(f"STT error: {e}")
    # #         import traceback

    # #         traceback.print_exc()
    # #         return None

    # # async def check_silence():
    # #     """Background task to check for silence timeout"""
    # #     nonlocal is_speaking, silence_start, speech_chunks, is_ai_speaking

    # #     while True:
    # #         await asyncio.sleep(0.1)
    # #         if is_ai_speaking:
    # #             continue

    # #         if is_speaking and silence_start:
    # #             elapsed = (datetime.now() - silence_start).total_seconds()

    # #             if elapsed >= SILENCE_THRESHOLD:
    # #                 logging.info("Silence threshold reached, processing speech...")
    # #                 is_speaking = False
    # #                 silence_start = None

    # #                 if speech_chunks:
    # #                     chunk_to_process = speech_chunks.copy()
    # #                     speech_chunks.clear()
    # #                     text = await process_speech(chunk_to_process)
    # #                     if text is None or len(text.strip()) == 0:
    # #                         logging.info(f"skipping {text}")
    # #                         continue
    # #                     ai_text = await llm.ainvoke(
    # #                         [
    # #                             SystemMessage(
    # #                                 content="You are an AI calling assistant talk with user in natural way, Keep the response concise 2-3 sentences only"
    # #                             ),
    # #                             HumanMessage(content=f"User said: {text}"),
    # #                         ]
    # #                     )
    # #                     await send_ai_audio(ai_text.content, websocket, stream_sid)

    # # silence_task = asyncio.create_task(check_silence())

    # # try:
    # #     while True:
    # #         data = await websocket.receive_json()
    # #         event = data.get("event")
    # #         # logging.info(f"WebSocket event: {data}")
    # #         if event == "connected":
    # #             stream_sid = data.get("streamSid")
    # #             logging.info(f"Stream connected with SID: {stream_sid}")
    # #             continue
    # #         if event == "start":
    # #             logging.info("Stream started by client")
    # #             stream_sid = data.get("streamSid")
    # #             await send_ai_audio(
    # #                 text="Hi good morning! How are you. How I can help you today?",
    # #                 websocket=websocket,
    # #                 stream_sid=stream_sid,
    # #             )

    # #         elif event == "media":
    # #             media_payload = data.get("media", {})
    # #             payload_b64 = media_payload.get("payload", "")
    # #             if not payload_b64:
    # #                 continue
    # #             ulaw_audio = base64.b64decode(payload_b64)
    # #             pcm_audio = audioop.ulaw2lin(ulaw_audio, 2)
    # #             try:
    # #                 is_speech = vad.is_speech(pcm_audio, 8000)
    # #                 if is_speech:
    # #                     if not is_speaking:
    # #                         logging.info("speech started")
    # #                         is_speaking = True
    # #                         speech_chunks.clear()
    # #                     silence_start = None
    # #                     speech_chunks.append(ulaw_audio)
    # #                 else:
    # #                     if is_speaking and silence_start is None:
    # #                         logging.info("Silence detected, starting timer....")
    # #                         silence_start = datetime.now()
    # #                     if is_speaking:
    # #                         speech_chunks.append(ulaw_audio)
    # #             except Exception as e:
    # #                 logging.info(f"VAD error: {e}")

    # #         elif event == "stop":
    # #             logging.info("Stream stopped by client")
    # #             if speech_chunks:
    # #                 await process_speech(speech_chunks)
    # #             break

    # # except WebSocketException as e:
    # #     logging.info(f"WebSocket error: {e}")
    # # except WebSocketDisconnect:
    # #     logging.info("Client disconnected")
    # # finally:
    # #     silence_task.cancel()
    # #     try:
    # #         await silence_task
    # #     except asyncio.CancelledError:
    # #         pass
    # rec = KaldiRecognizer(model, 16000)
    # stream_sid = None
    # messages: list[BaseMessage] = []

    # # State management
    # audio_buffer = bytearray()
    # is_ai_responding = False
    # is_speaking = False
    # silence_counter = 0

    # async def handle_user_input(user_text: str, stream_sid: str):
    #     nonlocal is_ai_responding, messages
    #     try:
    #         print(f"user input: {user_text}")
    #         ai_response = await llm.ainvoke(
    #             messages
    #             + [
    #                 SystemMessage(
    #                     content="You are an AI calling assistant talk with user in natural way, Keep the response concise 2-3 sentences only. while keep the conversation flowing naturally."
    #                 ),
    #                 HumanMessage(content=f"User said: {user_text}"),
    #             ]
    #         )
    #         print(f"AI response: {ai_response.content}")
    #         messages.append(HumanMessage(content=user_text))
    #         messages.append(AIMessage(content=ai_response.content))

    #         for chunk in voice.synthesize(ai_response.content, syn_config=syn):
    #             resampled_chunk, _ = audioop.ratecv(
    #                 chunk.audio_int16_bytes,
    #                 2,  # Sample width (16-bit)
    #                 1,  # Channels (Mono)
    #                 22050,
    #                 8000,
    #                 None,
    #             )

    #             # 3. Convert Linear PCM to Mu-law (Twilio Format)
    #             mu_law_chunk = audioop.lin2ulaw(resampled_chunk, 2)
    #             for i in range(0, len(mu_law_chunk), CHUNK_SIZE):
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
    #         is_ai_responding = False
    #     except WebSocketException as e:
    #         logging.info(f"WebSocket error: {e}")
    #     except WebSocketDisconnect:
    #         logging.info("Client disconnected")

    # try:
    #     while True:
    #         data = await websocket.receive_json()
    #         event = data.get("event")
    #         match event:
    #             case "start":
    #                 stream_sid = data["start"]["streamSid"]
    #                 print(f"Stream started: {stream_sid}")
    #             case "media":
    #                 if is_ai_responding:
    #                     continue
    #                 payload = data["media"]["payload"]
    #                 mu_law_chunk = base64.b64decode(payload)
    #                 pcm_chunk = audioop.ulaw2lin(mu_law_chunk, 2)
    #                 pcm_16k, _ = audioop.ratecv(
    #                     pcm_chunk,
    #                     2,  # sample width
    #                     1,  # channels
    #                     8000,  # input rate
    #                     16000,  # output rate
    #                     None,
    #                 )
    #                 if vad.is_speech(pcm_chunk, 16000):
    #                     if not is_speaking:
    #                         print("Speech detected...")
    #                         is_speaking = True
    #                     silence_counter = 0
    #                     audio_buffer.extend(pcm_16k)
    #                 else:
    #                     if is_speaking:
    #                         silence_counter += 20  # Each chunk is 20ms
    #                         audio_buffer.extend(pcm_16k)
    #                     if is_speaking and silence_counter >= SILENCE_THRESHOLD_MS:
    #                         is_ai_responding = True
    #                         is_speaking = False
    #                         print(
    #                             f"Silence detected. Processing... {len(audio_buffer)}"
    #                         )
    #                         np_audio = (
    #                             np.frombuffer(audio_buffer, dtype=np.int16).astype(
    #                                 np.float32
    #                             )
    #                             / 32768.0
    #                         )
    #                         result = whisper_model.transcribe(
    #                             np_audio, language="en", fp16=False
    #                         )
    #                         user_said = result.get("text", "")
    #                         if user_said.strip():
    #                             asyncio.create_task(
    #                                 handle_user_input(user_said.strip(), stream_sid)
    #                             )
    #                         else:
    #                             is_ai_responding = False
    #                         # rec.AcceptWaveform(bytes(audio_buffer))
    #                         # result = json.loads(rec.FinalResult())
    #                         # print(rec.Result())
    #                         # print(f"result: {result}")
    #                         # user_text = result.get("text", "")
    #                         # if user_text:
    #                         #     print(f"User said:  {user_text}")
    #                         # else:
    #                         #     print("No speech recognized.")

    #                         audio_buffer.clear()
    #                         is_speaking = False
    #                         silence_counter = 0
    #             case "stop":
    #                 print("Stream stopped by client")
    #                 break
    # except WebSocketException as e:
    #     logging.info(f"WebSocket error: {e}")
    # except WebSocketDisconnect:
    #     logging.info("Client disconnected")
    # finally:
    #     print(messages)
    #     pass


@router.post("/initiate")
async def initiate_call(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    logging.info(req.url_for("websocket_endpoint"))
    # resp = VoiceResponse()
    # connect = Connect()
    # connect.stream(url=req.url_for("websocket_endpoint"))
    # resp.append(connect)
    # resp.say("How i can help you.?", voice="Polly.Joanna-Neural")
    resp = await appointment_service.greeting(
        data=data,
        db=db,
        action_url=req.url_for("websocket_endpoint"),
        recording_status_callback=req.url_for("websocket_endpoint"),
        tenant_id=tenant.tenant_id,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/receive")
async def receive_call(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    resp = await appointment_service.greeting(
        data=data,
        db=db,
        action_url=req.url_for("process_voice"),
        recording_status_callback=req.url_for("recording_status"),
        tenant_id=tenant.tenant_id,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/process/voice")
async def process_voice(
    req: Request,
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    resp = await appointment_service.process_speech(
        action_url=req.url_for("process_voice"),
        db=db,
        data=data,
        feedback_url=req.url_for("feedback"),
        tenant_id=tenant.tenant_id,
    )
    return Response(content=str(resp), media_type="application/xml")


@router.post("/feedback")
async def feedback(
    data: TwilioIncoming = Depends(parse_webhook),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
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
):
    await appointment_service.change_status(
        data=data, db=db, tenant_id=tenant.tenant_id
    )
    return {"message": "ok"}


@router.post("/recording/status")
async def recording_status(
    data: TwilioRecordingCallback = Form(...),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
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
