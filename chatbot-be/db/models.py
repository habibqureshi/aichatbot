from db.db import Base
from sqlalchemy.orm import relationship
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Enum,
    Time,
    Date,
)
from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(100), unique=True, index=True)
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    conversations = relationship("Conversation", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    call_sid = Column(String(50), unique=True, index=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(25), default="active")
    summary = Column(Text, nullable=True)
    recording_link = Column(Text, nullable=True)
    resolved_status = Column(String(20), default="satisfied")

    patient = relationship("Patient", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(50))
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "appointment_date",
            "start_time",
            "end_time",
            name="uix_appointment_datetime",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    appointment_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    call_sid = Column(String(50), index=True)
    status = Column(String(50), default="scheduled")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")


class Knowledge(Base):
    __tablename__ = "knowledges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, unique=True)
    blob_name = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ActiveKnowledge(Base):
    __tablename__ = "active_knowledge"

    id = Column(Integer, primary_key=True, index=True)
    knowledge_id = Column(
        Integer,
        ForeignKey("knowledges.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    set_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    knowledge = relationship("Knowledge", backref="active_entry")


class Specialty(Base):
    __tablename__ = "specialties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    doctors = relationship("Doctor", back_populates="specialty")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialty_id = Column(Integer, ForeignKey("specialties.id"), nullable=True)
    phone_number = Column(String(100), unique=True, index=True)
    duration = Column(Integer, nullable=True, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    specialty = relationship("Specialty", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    availabilities = relationship("Availability", back_populates="doctor")


class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    day_of_week = Column(
        Enum(
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            name="day_of_week_enum",
        ),
        nullable=False,
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    doctor = relationship("Doctor", back_populates="availabilities")
