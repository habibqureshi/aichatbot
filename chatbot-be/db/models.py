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
    Boolean,
    Float,
)
from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    host = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    phone_number = Column(String(100), index=True)
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uix_patient_phone_tenant"),
    )
    name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    conversations = relationship("Conversation", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    call_sid = Column(String(50), index=True)
    __table_args__ = (
        UniqueConstraint("tenant_id", "call_sid", name="uix_conversation_call_sid_tenant"),
    )
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(25), default="active")
    summary = Column(Text, nullable=True)
    recording_link = Column(Text, nullable=True)
    resolved_status = Column(String(20), default="satisfied")

    patient = relationship("Patient", back_populates="conversations")
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(50))
    content = Column(Text)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "doctor_id",
            "appointment_date",
            "start_time",
            "end_time",
            name="uix_appointment_datetime_tenant",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
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
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    name = Column(String(100), index=True)
    blob_name = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    key = Column(String(100))
    __table_args__ = (
        UniqueConstraint("tenant_id", "key", name="uix_appsetting_key_tenant"),
    )
    value = Column(Text, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    username = Column(String(150), index=True, nullable=False)
    __table_args__ = (
        UniqueConstraint("tenant_id", "username", name="uix_user_username_tenant"),
    )
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ActiveKnowledge(Base):
    __tablename__ = "active_knowledge"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    knowledge_id = Column(
        Integer,
        ForeignKey("knowledges.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    set_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    knowledge = relationship("Knowledge", backref="active_entry")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    # store specialty as a string (name/code) instead of a foreign key
    specialty = Column(String(100), nullable=True)
    phone_number = Column(String(100), index=True)
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uix_doctor_phone_tenant"),
    )
    duration = Column(Integer, nullable=True, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
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


class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    table_number = Column(String(20), nullable=False)
    __table_args__ = (
        UniqueConstraint("tenant_id", "table_number", name="uix_table_number_tenant"),
    )
    location = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    table_id = Column(Integer, ForeignKey("restaurant_tables.id"))
    reservation_date = Column(DateTime, nullable=False)
    party_size = Column(Integer, nullable=False)
    status = Column(
        Enum(
            "pending",
            "confirmed",
            "cancelled",
            "completed",
            "no_show",
            name="reservation_status_enum",
        ),
        default="pending",
        index=True,
    )
    customer = relationship("Customer", lazy="joined")
    special_request = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cancelled_at = Column(DateTime, nullable=True)


class RestaurantSetting(Base):
    __tablename__ = "restaurant_settings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    phone_number = Column(String(100), index=True)
    name = Column(String(150), nullable=True)
    delivery_address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uix_customer_phone_tenant"),
    )

    orders = relationship("Order", back_populates="customer")
    conversations = relationship("Conversation", back_populates="customer")


class Menu(Base):
    __tablename__ = "menus"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    name = Column(String(150), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")
    total_amount = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    item_name = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True, nullable=False)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token = Column(String(255), index=True, nullable=False)
    __table_args__ = (
        UniqueConstraint("tenant_id", "token", name="uix_refresh_token_tenant"),
    )
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="refresh_tokens")
