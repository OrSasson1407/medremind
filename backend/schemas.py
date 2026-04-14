from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

# Match the supported languages from our database models
class LanguageEnum(str, Enum):
    en = "en"
    he = "he"
    ar = "ar"

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

class MedicationResponse(MedicationBase):
    id: int
    patient_id: int
    created_at: datetime

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
    caregiver_id: Optional[int] = None # Optional for now until we build User Auth

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    # This automatically fetches all medications linked to this patient
    medications: List[MedicationResponse] = []

    class Config:
        from_attributes = True