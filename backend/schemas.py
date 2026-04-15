from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, time
from enum import Enum

class LanguageEnum(str, Enum):
    en = "en"
    he = "he"
    ar = "ar"


# ==========================================
# Auth Schemas
# ==========================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None


# ==========================================
# DoseLog Schemas
# ==========================================

class DoseLogResponse(BaseModel):
    id: int
    schedule_id: int
    scheduled_at: datetime
    is_taken: bool
    status: str
    skip_reason: Optional[str]
    taken_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class DoseLogMark(BaseModel):
    """Payload to mark a dose as taken. PIN is verified server-side."""
    dose_log_id: int
    pin_code: str
    status: str  # "taken" or "skipped"
    skip_reason: Optional[str] = None


# ==========================================
# Escalation Contacts
# ==========================================

class EscalationContactBase(BaseModel):
    name: str
    phone: str
    priority: int = 1
    notify_after_missed: int = 2

class EscalationContactCreate(EscalationContactBase):
    patient_id: int

class EscalationContactResponse(EscalationContactBase):
    id: int
    patient_id: int

    class Config:
        from_attributes = True


# ==========================================
# Schedule Schemas
# ==========================================

class ScheduleCreate(BaseModel):
    medication_id: int
    scheduled_time: time          # "08:00:00"

class ScheduleResponse(BaseModel):
    id: int
    medication_id: int
    scheduled_time: time
    active: bool
    dose_logs: List[DoseLogResponse] = []

    class Config:
        from_attributes = True


# ==========================================
# Medication Schemas
# ==========================================

class MedicationBase(BaseModel):
    name: str
    dosage: str
    form: Optional[str] = None
    pill_count: Optional[int] = 0
    refill_threshold: Optional[int] = 7
    instructions: Optional[str] = None

class MedicationCreate(MedicationBase):
    patient_id: int
    # Convenience: supply one time when creating, creates a Schedule automatically
    reminder_time: Optional[str] = None   # "HH:MM"

class MedicationRefillUpdate(BaseModel):
    pill_count: int

class MedicationResponse(MedicationBase):
    id: int
    patient_id: int
    active: bool
    created_at: datetime
    schedules: List[ScheduleResponse] = []

    class Config:
        from_attributes = True


# ==========================================
# Patient Schemas
# ==========================================

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    pin_code: str
    language: LanguageEnum = LanguageEnum.he

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int
    caregiver_id: Optional[int]
    created_at: datetime
    medications: List[MedicationResponse] = []
    escalation_contacts: List[EscalationContactResponse] = []

    class Config:
        from_attributes = True

# Slim version used by GET /patients/ — no nested dose_logs, just schedule times.
class ScheduleSummary(BaseModel):
    id: int
    scheduled_time: time

    class Config:
        from_attributes = True

class MedicationSummary(BaseModel):
    id: int
    name: str
    dosage: str
    form: Optional[str]
    pill_count: int
    refill_threshold: int
    schedules: List[ScheduleSummary] = []

    class Config:
        from_attributes = True

class PatientSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    pin_code: str
    language: LanguageEnum
    caregiver_id: Optional[int]
    created_at: datetime
    medications: List[MedicationSummary] = []

    class Config:
        from_attributes = True


# ==========================================
# Adherence / Stats Schemas
# ==========================================

class AdherenceStats(BaseModel):
    patient_id: int
    patient_name: str
    total_doses: int
    taken_doses: int
    missed_doses: int
    adherence_pct: float