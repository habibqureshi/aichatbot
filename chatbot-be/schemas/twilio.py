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


def parse_twilio_recording(
    AccountSid: str = Form(...),
    CallSid: str = Form(...),
    ErrorCode: int | None = Form(None),
    RecordingChannels: int | None = Form(None),
    RecordingDuration: int | None = Form(None),
    RecordingSid: str = Form(...),
    RecordingSource: str = Form(...),
    RecordingStartTime: str = Form(...),
    RecordingStatus: str = Form(...),
    RecordingTrack: str = Form(...),
    RecordingUrl: str = Form(...),
) -> TwilioRecordingCallback:
    return TwilioRecordingCallback(
        AccountSid=AccountSid,
        CallSid=CallSid,
        ErrorCode=ErrorCode,
        RecordingChannels=RecordingChannels,
        RecordingDuration=RecordingDuration,
        RecordingSid=RecordingSid,
        RecordingSource=RecordingSource,
        RecordingStartTime=datetime.strptime(
            RecordingStartTime, "%a, %d %b %Y %H:%M:%S %z"
        ),
        RecordingStatus=RecordingStatus,
        RecordingTrack=RecordingTrack,
        RecordingUrl=RecordingUrl,
    )
