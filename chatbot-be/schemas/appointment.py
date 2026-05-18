from __future__ import annotations

import asyncio
from datetime import date, time, datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict

from db.models import Conversation, Customer as CustomerModel
from schemas.common import TimezoneMixin
from schemas.doctor import DoctorBase
from schemas.customer import Customer
from langchain_core.messages import BaseMessage
from langgraph.graph.state import CompiledStateGraph


class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: date
    start_time: time
    end_time: time
    status: str | None = None
    notes: str | None = None
    call_sid: str | None = None

    model_config = ConfigDict(from_attributes=True)


class Appointment(TimezoneMixin, AppointmentBase):
    id: int
    created_at: datetime
    customer: Customer | None = None
    doctor: DoctorBase | None = None

    _timezone_fields: ClassVar[list[str]] = ["created_at"]

    model_config = ConfigDict(from_attributes=True)


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_id: int | None = None
    doctor_id: int | None = None
    appointment_date: datetime | None = None
    status: str | None = None
    notes: str | None = None
    call_sid: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StreamState:
    def __init__(self):
        self.stream_sid: str | None = None
        self.audio_buffer = bytearray()
        self.messages: list[BaseMessage] = []

        self.is_ai_responding = False
        self.is_speaking = False
        self.is_interrupted = False

        self.silence_counter = 0
        self.interruption_speech_duration = 0

        self.conversation: Conversation | None = None
        self.customer: CustomerModel | None = None
        self.graph: CompiledStateGraph | None = None

        self.resample_state = None
        self.processing_task: asyncio.Task | None = None
        self.stop = False
