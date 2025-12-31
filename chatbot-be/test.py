from openai import OpenAI
import audioop
import base64

openai_client = OpenAI(base_url="http://localhost:8880/v1", api_key="not-needed")
with openai_client.audio.speech.with_streaming_response.create(
    model="kokoro",
    voice="af_sky(0.6)+af_bella(0.4)",
    input="Ask imran to complete task as soon as possible we have other chores, how much time he needs?",
    response_format="pcm",
) as response:

    for chunk in response.iter_bytes(chunk_size=160):
        if not chunk:
            continue
        # resampled_pcm, _ = audioop.ratecv(chunk, 2, 1, 24000, 8000, None)
        ulaw_data = audioop.lin2ulaw(chunk, 2)
        payload = base64.b64encode(ulaw_data).decode()
        print(payload)
