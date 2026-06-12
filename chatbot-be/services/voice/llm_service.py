import random
import time
from logging import Logger
from graph.order_graph import OrderState
from schemas.voice_session import OrderVoiceSessionState
from cartesia.resources.tts import AsyncWebSocketContext
from langchain_core.messages import AIMessageChunk, AIMessage, HumanMessage
from services import message_service
from services.voice import constants


async def generate_response(
    user_text: str,
    state: OrderVoiceSessionState,
    context: AsyncWebSocketContext,
    tenant_id: int,
    log: Logger,
):
    log.info("LLM | start | text=%r", user_text)
    state.db_messages.append(
        message_service.create_object(state.conversation, user_text, "user", tenant_id)
    )
    stream_buffer = ""
    t0 = time.monotonic()
    _first_send = False
    _hold_sent = False

    async def _send_hold(tool_name: str | None = None) -> None:
        nonlocal _first_send, _hold_sent
        if _hold_sent:
            return
        _hold_sent = True
        phrases = constants.TOOL_PHRASES.get(tool_name) if tool_name else None
        phrase = random.choice(phrases or constants.DEFAULT_PHRASES)
        log.info("LLM | hold phrase (tool=%s) %r | latency=%.2fs", tool_name, phrase, time.monotonic() - t0)
        await context.send(transcript=phrase, continue_=True, **state.cartesia_kw)
        _first_send = True

    try:
        async for chunk in state.graph.astream(
            OrderState(
                messages=state.messages + [HumanMessage(content=user_text)],
                user_input=user_text,
                customer_phone=state.conversation.customer.phone_number,
                customer_name=state.conversation.customer.name,
                delivery_address=state.conversation.customer.delivery_address,
            ),
            stream_mode=["messages", "values"],
        ):
            if state.interrupt_event.is_set():
                log.info("LLM | interrupted after %.2fs", time.monotonic() - t0)
                break

            mode, data = chunk
            match (mode):
                case "messages":
                    token, metadata = data
                    if isinstance(token, AIMessageChunk):
                        if not token.content:
                            continue

                        stream_buffer += token.content

                        # Check if a full forbidden marker has accumulated
                        triggered = next(
                            (
                                m
                                for m in constants.VOICE_FORBIDDEN_MARKERS
                                if m in stream_buffer
                            ),
                            None,
                        )
                        if triggered:
                            stream_buffer = stream_buffer.replace(triggered, "").strip()
                            if triggered == "**FINISH_CONVERSATION**":
                                log.info("LLM | FINISH_CONVERSATION marker detected")
                                state.stop_event.set()
                            elif triggered == "**NEEDS_HUMAN_INTERVENTION**":
                                log.info("LLM | NEEDS_HUMAN_INTERVENTION marker detected")
                                state.human_event.set()
                            if stream_buffer:
                                if not _first_send:
                                    log.info(
                                        "LLM | first token to TTS | latency=%.2fs",
                                        time.monotonic() - t0,
                                    )
                                    _first_send = True
                                await context.send(
                                    transcript=stream_buffer,
                                    continue_=True,
                                    **state.cartesia_kw,
                                )
                                stream_buffer = ""
                            break

                        # Hold back while buffer could still be a marker prefix
                        if any(
                            m.startswith(stream_buffer.strip())
                            for m in constants.VOICE_FORBIDDEN_MARKERS
                        ):
                            continue

                        # Send token immediately — Cartesia handles continuation
                        if not _first_send:
                            log.info(
                                "LLM | first token to TTS | latency=%.2fs",
                                time.monotonic() - t0,
                            )
                            _first_send = True
                        await context.send(
                            transcript=stream_buffer,
                            continue_=True,
                            **state.cartesia_kw,
                        )
                        stream_buffer = ""

                case "values":
                    msgs = data.get("messages") or []
                    last = msgs[-1] if msgs else None
                    if isinstance(last, AIMessage) and last.tool_calls:
                        tool_name = last.tool_calls[0].get("name") if last.tool_calls else None
                        await _send_hold(tool_name)
                    state.messages = msgs
                    if (
                        isinstance(last, AIMessage)
                        and last.content
                        and not last.tool_calls
                    ):
                        state.db_messages.append(
                            message_service.create_object(
                                state.conversation,
                                last.content,
                                "assistant",
                                tenant_id,
                            )
                        )

        # Finalize: flush remaining buffer and close the Cartesia TTS turn
        await context.send(
            transcript=stream_buffer.strip(),
            continue_=False,
            **state.cartesia_kw,
        )
        log.info("LLM | done | elapsed=%.2fs", time.monotonic() - t0)
    except Exception as exc:
        log.error("LLM | exception after %.2fs: %s", time.monotonic() - t0, exc)
