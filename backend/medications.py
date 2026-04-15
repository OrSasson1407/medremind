from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import time as dt_time

import database, models, schemas, auth

router = APIRouter()

@router.post("/", response_model=schemas.MedicationResponse, status_code=status.HTTP_201_CREATED)
def create_medication(
    payload: schemas.MedicationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Verify patient ownership
    patient = db.query(models.Patient).filter(
        models.Patient.id == payload.patient_id, 
        models.Patient.caregiver_id == current_user.id
    ).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or unauthorized")

    med_data = payload.model_dump(exclude={"reminder_time"})
    med = models.Medication(**med_data)
    db.add(med)
    db.flush()

    if payload.reminder_time:
        h, m = map(int, payload.reminder_time.split(":"))
        schedule = models.Schedule(medication_id=med.id, scheduled_time=dt_time(h, m))
        db.add(schedule)

    db.commit()
    db.refresh(med)
    return med

@router.put("/{medication_id}/refill", response_model=schemas.MedicationResponse)
def update_refill(
    medication_id: int,
    payload: schemas.MedicationRefillUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    med = db.query(models.Medication).join(models.Patient).filter(
        models.Medication.id == medication_id, 
        models.Patient.caregiver_id == current_user.id
    ).first()
    
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.pill_count = payload.pill_count
    db.commit()
    db.refresh(med)
    return med