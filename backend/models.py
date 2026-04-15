from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Time, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class LanguageEnum(str, enum.Enum):
    en = "en"
    he = "he"
    ar = "ar"


class User(Base):
    """The family member / caregiver managing the dashboard."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patients = relationship("Patient", back_populates="caregiver", cascade="all, delete-orphan")


class Patient(Base):
    """The elderly user interacting with the mobile app."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    pin_code = Column(String, nullable=False)
    language = Column(SQLEnum(LanguageEnum), default=LanguageEnum.he)
    caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    caregiver = relationship("User", back_populates="patients")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    escalation_contacts = relationship("EscalationContact", back_populates="patient", cascade="all, delete-orphan")


class EscalationContact(Base):
    """Emergency contacts for when a patient misses multiple consecutive doses."""
    __tablename__ = "escalation_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    priority = Column(Integer, default=1)
    notify_after_missed = Column(Integer, default=2)

    patient = relationship("Patient", back_populates="escalation_contacts")


class Medication(Base):
    """A drug assigned to a patient, with inventory tracking for refills."""
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    form = Column(String, nullable=True)
    pill_count = Column(Integer, default=0)
    refill_threshold = Column(Integer, default=7)
    instructions = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="medications")
    schedules = relationship("Schedule", back_populates="medication", cascade="all, delete-orphan")


class Schedule(Base):
    """
    A recurring daily time slot for a medication.
    Each row = one alarm per day. Actual outcomes stored in DoseLog.
    """
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    scheduled_time = Column(Time, nullable=False)
    active = Column(Boolean, default=True)

    medication = relationship("Medication", back_populates="schedules")
    dose_logs = relationship("DoseLog", back_populates="schedule", cascade="all, delete-orphan")


class DoseLog(Base):
    """
    One record per scheduled dose event.
    Created by the scheduler when a reminder fires;
    updated by the patient when they confirm or miss the dose.
    """
    __tablename__ = "dose_logs"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    is_taken = Column(Boolean, default=False)
    taken_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="missed") # 'taken', 'skipped', 'missed'
    skip_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    schedule = relationship("Schedule", back_populates="dose_logs")