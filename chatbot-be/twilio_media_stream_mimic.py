#!/usr/bin/env python3
"""
Interactive Twilio media-stream simulator for local testing.

Behavior:
1) Optionally calls your webhook endpoint (`ws_greeting`) as Twilio would.
2) Extracts the `<Stream url="...">` WebSocket URL from returned TwiML.
3) Opens WebSocket and runs a full-duplex loop:
   - sends microphone audio as Twilio `media` events (mu-law @ 8kHz, 20ms frames)
   - receives server `media` events and plays them to your speakers
4) Sends Twilio-style `connected`, `start`, and `stop` events.

Usage:
  python twilio_media_stream_mimic.py --webhook-url http://127.0.0.1:8000/api/v1/appointment/ws/greeting

  python twilio_media_stream_mimic.py --ws-url ws://127.0.0.1:8000/api/v1/appointment/ws/stream-call
"""

from __future__ import annotations

import argparse
import audioop
import asyncio
import base64
import json
import queue
import random
import string
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

try:
    import websockets
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: websockets\n" "Install with: pip install websockets"
    ) from exc

import numpy as np

try:
    import sounddevice as sd
except ImportError:
    sd = None
try:
    import webrtcvad
except ImportError:
    webrtcvad = None

FRAME_MS = 20
SAMPLE_RATE = 8000
SAMPLES_PER_FRAME = int(SAMPLE_RATE * FRAME_MS / 1000)  # 160
PCM_WIDTH = 2  # int16
CLIENT_VAD_AGGRESSIVENESS = 3


def random_id(prefix: str, size: int = 16) -> str:
    chars = string.ascii_letters + string.digits
    return prefix + "".join(random.choice(chars) for _ in range(size))


def post_form(url: str, form_data: dict[str, str]) -> str:
    encoded = urllib.parse.urlencode(form_data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Webhook failed: HTTP {exc.code} {exc.reason}\nResponse body: {body}"
        ) from exc


def extract_stream_url_from_twiml(twiml_xml: str) -> str:
    root = ET.fromstring(twiml_xml)
    stream = root.find(".//Stream")
    if stream is None:
        raise ValueError("No <Stream> tag found in TwiML response")
    url = stream.get("url")
    if not url:
        raise ValueError("<Stream> exists but has no url attribute")
    return url


async def run_media_stream(
    ws_url: str,
    call_sid: str,
    from_number: str,
    to_number: str,
) -> None:
    stream_sid = random_id("MZ", 32)
    account_sid = "AC_TEST_ACCOUNT_SID"

    async with websockets.connect(ws_url, ping_interval=20, ping_timeout=20) as ws:
        connected_event = {
            "event": "connected",
            "protocol": "Call",
            "version": "1.0.0",
        }
        await ws.send(json.dumps(connected_event))
        print("-> sent connected")

        start_event = {
            "event": "start",
            "streamSid": stream_sid,
            "start": {
                "accountSid": account_sid,
                "streamSid": stream_sid,
                "callSid": call_sid,
                "tracks": ["inbound"],
                "mediaFormat": {
                    "encoding": "audio/x-mulaw",
                    "sampleRate": 8000,
                    "channels": 1,
                },
                "customParameters": {
                    "From": from_number,
                    "To": to_number,
                },
            },
        }
        await ws.send(json.dumps(start_event))
        print(f"-> sent start (streamSid={stream_sid}, callSid={call_sid})")

        if sd is None:
            raise SystemExit(
                "Interactive simulation requires sounddevice.\n"
                "Install with: pip install sounddevice"
            )

        stop_event = asyncio.Event()
        outbound_audio_q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=500)
        inbound_audio_q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=200)
        loop = asyncio.get_running_loop()
        frame_bytes = SAMPLES_PER_FRAME * PCM_WIDTH
        mic_pending = bytearray()

        def enqueue_outbound(chunk: bytes) -> None:
            """
            Keep real-time behavior:
            - if the queue is full, drop the oldest frame
            - enqueue the newest frame
            """
            if len(chunk) != frame_bytes:
                return
            print(
                f"-> enqueueing outbound audio chunk (size={outbound_audio_q.qsize()}) bytes)"
            )
            try:
                outbound_audio_q.put_nowait(chunk)
            except asyncio.QueueFull:
                _ = outbound_audio_q.get_nowait()
                outbound_audio_q.put_nowait(chunk)

        def mic_callback(indata, _frames, _time, status):
            # Keep buffering and only enqueue exact 20ms frames.
            # This avoids truncation/padding and keeps VAD frame sizes stable.
            try:
                if status:
                    # Even if status is reported, still process audio we got.
                    pass
                mic_pending.extend(bytes(indata))
                while len(mic_pending) >= frame_bytes:
                    chunk = bytes(mic_pending[:frame_bytes])
                    del mic_pending[:frame_bytes]
                    loop.call_soon_threadsafe(enqueue_outbound, chunk)
            except Exception:
                # Real-time audio callbacks should never crash.
                pass

        def speaker_callback(outdata, _frames, _time, status):
            if status:
                pass
            try:
                frame = inbound_audio_q.get_nowait()
            except asyncio.QueueEmpty:
                frame = b"\x00" * (SAMPLES_PER_FRAME * PCM_WIDTH)

            expected = SAMPLES_PER_FRAME * PCM_WIDTH
            if len(frame) < expected:
                frame = frame.ljust(expected, b"\x00")
            elif len(frame) > expected:
                frame = frame[:expected]

            samples = np.frombuffer(frame, dtype=np.int16)
            samples = samples.reshape((-1, 1))
            outdata[:] = samples

        async def sender():
            chunk = 1
            timestamp = 0
            while not stop_event.is_set():
                # Take the latest frame to avoid "old audio" latency.
                pcm = await outbound_audio_q.get()

                mu_law = audioop.lin2ulaw(pcm, PCM_WIDTH)
                # print(f"-> sending chunk {chunk} (timestamp={timestamp}ms, {mu_law} )")
                media_event = {
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {
                        "track": "inbound",
                        "chunk": str(chunk),
                        "timestamp": str(timestamp),
                        "payload": base64.b64encode(mu_law).decode("utf-8"),
                    },
                }
                await ws.send(json.dumps(media_event))
                chunk += 1
                timestamp += FRAME_MS

        async def receiver():
            while not stop_event.is_set():
                try:
                    msg = await ws.recv()
                except Exception:
                    stop_event.set()
                    break
                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue
                if data.get("event") == "clear":
                    print("<- received clear: purging inbound audio queue")
                    # Empty the queue by repeatedly getting until empty
                    while not inbound_audio_q.empty():
                        try:
                            inbound_audio_q.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                    continue
                if data.get("event") != "media":
                    continue
                payload = data.get("media", {}).get("payload")
                if not payload:
                    continue
                mu_law = base64.b64decode(payload)
                pcm = audioop.ulaw2lin(mu_law, PCM_WIDTH)
                expected = SAMPLES_PER_FRAME * PCM_WIDTH
                for i in range(0, len(pcm), expected):
                    chunk = pcm[i : i + expected]
                    # Pad the final small chunk if necessary
                    if len(chunk) < expected:
                        chunk = chunk.ljust(expected, b"\x00")
                    try:
                        await inbound_audio_q.put(chunk)
                    except asyncio.QueueFull:
                        # If speakers are behind, drop old audio to maintain real-time
                        _ = inbound_audio_q.get_nowait()
                        await inbound_audio_q.put(chunk)

        print("Interactive stream started. Speak into mic. Press Ctrl+C to stop.")
        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
            blocksize=SAMPLES_PER_FRAME,
            callback=mic_callback,
        ), sd.RawOutputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
            blocksize=SAMPLES_PER_FRAME,
            callback=speaker_callback,
        ):
            tasks = [asyncio.create_task(sender()), asyncio.create_task(receiver())]
            try:
                await asyncio.gather(*tasks)
            except KeyboardInterrupt:
                # Make sure we still send Twilio-style `stop` on Ctrl+C.
                stop_event.set()
                print("\n-> stopping (Ctrl+C)")
            finally:
                stop_event.set()
                for t in tasks:
                    t.cancel()

        stop_event = {
            "event": "stop",
            "streamSid": stream_sid,
            "stop": {"accountSid": account_sid, "callSid": call_sid},
        }
        await ws.send(json.dumps(stop_event))
        print("-> sent stop")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Twilio Media Stream simulator")
    parser.add_argument(
        "--webhook-url",
        help="Your ws_greeting webhook URL (returns TwiML with <Stream url=...>)",
    )
    parser.add_argument(
        "--ws-url",
        help="Direct WebSocket URL (skip webhook call), e.g. ws://host/.../ws/stream-call",
    )
    parser.add_argument(
        "--call-sid",
        default=random_id("CA", 32),
        help="Twilio-like CallSid to use for this test",
    )
    parser.add_argument("--from-number", default="+15551230000")
    parser.add_argument("--to-number", default="+15557654321")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    if not args.webhook_url and not args.ws_url:
        raise SystemExit("Provide either --webhook-url or --ws-url")

    ws_url = args.ws_url
    if args.webhook_url:
        form_data = {
            "CallSid": args.call_sid,
            "AccountSid": "AC_TEST_ACCOUNT_SID",
            "From": args.from_number,
            "To": args.to_number,
            "CallStatus": "in-progress",
            "Direction": "inbound",
            "ApiVersion": "2010-04-01",
        }
        print(f"POST webhook: {args.webhook_url}")
        twiml = post_form(args.webhook_url, form_data)
        print("Webhook TwiML received:")
        print(twiml)
        ws_url = extract_stream_url_from_twiml(twiml)
        print(f"Extracted stream URL: {ws_url}")

    if not ws_url:
        raise SystemExit("No WebSocket URL available")

    await run_media_stream(
        ws_url=ws_url,
        call_sid=args.call_sid,
        from_number=args.from_number,
        to_number=args.to_number,
    )
    print("Simulation complete.")


if __name__ == "__main__":
    asyncio.run(main())
