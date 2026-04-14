from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Time, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

# Define the supported languages for the TTS feature
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

    # One caregiver can manage multiple patients
    patients = relationship("Patient", back_populates="caregiver", cascade="all, delete-orphan")

class Patient(Base):
    """The elderly user interacting with the mobile app."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    # A simple PIN for the elderly app login to avoid complex passwords
    pin_code = Column(String, nullable=False) 
    language = Column(SQLEnum(LanguageEnum), default=LanguageEnum.he)
    caregiver_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    caregiver = relationship("User", back_populates="patients")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")

class Medication(Base):
    """The specific drug details."""
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False) # e.g., "50mg"
    form = Column(String) # e.g., "Pill", "Liquid"
    inventory_count = Column(Integer, default=0) # Track for refill alerts
    instructions = Column(String) # e.g., "Take with food"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="medications")
    schedules = relationship("Schedule", back_populates="medication", cascade="all, delete-orphan")

class Schedule(Base):
    """The specific times a medication needs to be taken."""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"))
    scheduled_time = Column(Time, nullable=False) # e.g., 08:00 AM
    is_taken = Column(Boolean, default=False)
    taken_at = Column(DateTime(timezone=True), nullable=True) # Exact time they confirmed

    medication = relationship("Medication", back_populates="schedules")