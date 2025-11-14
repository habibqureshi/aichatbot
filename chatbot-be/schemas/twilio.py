from pydantic import BaseModel, HttpUrl, field_validator
from fastapi import Form
from datetime import datetime


class TwilioIncoming(BaseModel):
    CallSid: str
    AccountSid: str
    From: str
    To: str
    CallStatus: str | None = None
    Direction: str | None = None
    ApiVersion: str | None = None
    SpeechResult: str | None = None
    Digits: str | None = None


class TwilioRecordingCallback(BaseModel):
    AccountSid: str
    CallSid: str
    ErrorCode: int | None = None
    RecordingChannels: int | None = None
    RecordingDuration: int | None = None
    RecordingSid: str
    RecordingSource: str
    RecordingStartTime: datetime
    RecordingStatus: str
    RecordingTrack: str
    RecordingUrl: HttpUrl

    @field_validator("RecordingStartTime", mode="before")
    def parse_recording_start_time(cls, v):
        if isinstance(v, datetime):
            return v
        return datetime.strptime(v, "%a, %d %b %Y %H:%M:%S %z")


def parse_webhook(
    CallSid: str = Form(...),
    AccountSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    CallStatus: str = Form(None),
    Direction: str = Form(None),
    ApiVersion: str = Form(None),
    SpeechResult: str = Form(None),
    Digits: str = Form(None),
) -> TwilioIncoming:
    return TwilioIncoming(
        CallSid=CallSid,
        CallStatus=CallStatus,
        AccountSid=AccountSid,
        From=From,
        To=To,
        Direction=Direction,
        ApiVersion=ApiVersion,
        SpeechResult=SpeechResult,
        Digits=Digits,
    )
