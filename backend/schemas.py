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
    taken_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class DoseLogMark(BaseModel):
    """Payload to mark a dose as taken."""
    dose_log_id: int


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
    inventory_count: Optional[int] = 0
    instructions: Optional[str] = None

class MedicationCreate(MedicationBase):
    patient_id: int
    # Convenience: supply one time when creating, creates a Schedule automatically
    reminder_time: Optional[str] = None   # "HH:MM"

class MedicationResponse(MedicationBase):
    id: int
    patient_id: int
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