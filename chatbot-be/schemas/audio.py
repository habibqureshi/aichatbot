from pydantic import BaseModel, ConfigDict


class CartesiaOutputFormat(BaseModel):
    container: str = "raw"
    encoding: str = "pcm_mulaw"
    sample_rate: int = 8000

    model_config = ConfigDict(frozen=True)


class CartesiaVoiceMode(BaseModel):
    id: str
    mode: str = "id"

    model_config = ConfigDict(frozen=True)


class CartesiaTTSConfig(BaseModel):
    """Typed representation of the kwargs passed to every Cartesia TTS send() call."""

    model_id: str = "sonic-3"
    voice: CartesiaVoiceMode
    output_format: CartesiaOutputFormat = CartesiaOutputFormat()

    model_config = ConfigDict(frozen=True)

    def to_kwargs(self) -> dict:
        """Return a plain dict accepted directly by the Cartesia SDK send() method."""
        return {
            "model_id": self.model_id,
            "voice": {
                "id": self.voice.id,
                "mode": self.voice.mode,
            },
            "output_format": {
                "container": self.output_format.container,
                "encoding": self.output_format.encoding,
                "sample_rate": self.output_format.sample_rate,
            },
        }

    @classmethod
    def for_voice_id(cls, voice_id: str) -> "CartesiaTTSConfig":
        """Convenience constructor for the standard 8 kHz μ-law phone format."""
        return cls(voice=CartesiaVoiceMode(id=voice_id))
