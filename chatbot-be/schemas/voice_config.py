from pydantic import BaseModel, ConfigDict, Field

from configs import (
    SILENCE_PROMPT_WAIT_SEC,
    SILENCE_MAX_PROMPTS,
    OPENAI_REALTIME_OPEN_TIMEOUT,
    OPENAI_REALTIME_CONNECT_RETRIES,
)


class SilenceConfig(BaseModel):
    """Controls when the AI prompts an idle caller and eventually ends the call."""

    wait_sec: float = Field(
        default=SILENCE_PROMPT_WAIT_SEC,
        description="Seconds of user silence before the first inactivity prompt.",
    )
    max_prompts: int = Field(
        default=SILENCE_MAX_PROMPTS,
        description="Maximum number of 'still there?' prompts before hanging up.",
    )

    model_config = ConfigDict(frozen=True)


class OpenAIRealtimeConfig(BaseModel):
    """Connection parameters for the OpenAI Realtime transcription WebSocket."""

    url: str = "wss://api.openai.com/v1/realtime?intent=transcription"
    open_timeout: float = Field(
        default=OPENAI_REALTIME_OPEN_TIMEOUT,
        description="Handshake timeout in seconds.",
    )
    connect_retries: int = Field(
        default=OPENAI_REALTIME_CONNECT_RETRIES,
        description="Number of connection attempts before giving up.",
    )

    model_config = ConfigDict(frozen=True)


class VoicePipelineConfig(BaseModel):
    """Aggregated runtime configuration for a voice pipeline session."""

    silence: SilenceConfig = Field(default_factory=SilenceConfig)
    openai_realtime: OpenAIRealtimeConfig = Field(default_factory=OpenAIRealtimeConfig)

    model_config = ConfigDict(frozen=True)

    @classmethod
    def from_env(cls) -> "VoicePipelineConfig":
        return cls(
            silence=SilenceConfig(),
            openai_realtime=OpenAIRealtimeConfig(),
        )
