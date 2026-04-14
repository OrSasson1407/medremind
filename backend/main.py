from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

import database
import models
import schemas
import tts_service
from worker import generate_reminder_task

# Tell SQLAlchemy to create all tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="MedRemind API", version="1.0.0")

# ==========================================
# CORS Configuration
# ==========================================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Background Scheduler (The "Clock")
# ==========================================
def check_schedules():
    """Runs every minute to check if any medication needs to be taken now."""
    db = database.SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        print(f"[SCHEDULER] Checking for medications scheduled at {current_time}...")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_schedules, 'interval', seconds=60)
    scheduler.start()
    print("[SYSTEM] Background scheduler started successfully.")

# ==========================================
# Core Routes
# ==========================================

@app.get("/")
def read_root():
    return {"status": "online"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/patients/", response_model=schemas.PatientResponse)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/patients/", response_model=List[schemas.PatientResponse])
def get_patients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Patient).offset(skip).limit(limit).all()

@app.post("/medications/", response_model=schemas.MedicationResponse)
def create_medication(medication: schemas.MedicationCreate, db: Session = Depends(database.get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == medication.patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db_medication = models.Medication(**medication.model_dump())
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication

@app.get("/generate-audio/")
def generate_audio(text: str, lang: str = "he"):
    try:
        filepath = tts_service.generate_voice_reminder(text, lang)
        return FileResponse(filepath, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-background-worker/")
def test_celery_worker(patient_name: str = "Saba", medication_name: str = "Aspirin", lang: str = "he"):
    task = generate_reminder_task.delay(patient_name, medication_name, lang)
    return {"message": "Background task sent to Redis!", "task_id": task.id}