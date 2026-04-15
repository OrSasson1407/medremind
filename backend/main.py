from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, time as dt_time, timezone
from apscheduler.schedulers.background import BackgroundScheduler

import database
import models
import schemas
import tts_service
import auth
from worker import generate_reminder_task

# ── Bootstrap ─────────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="MedRemind API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Scheduler ─────────────────────────────────────────────────────────────────

def check_schedules():
    """Runs every minute. Fires TTS reminders and creates DoseLog entries."""
    db = database.SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        print(f"[SCHEDULER] Checking at {current_time}...")

        rows = (
            db.query(models.Schedule, models.Medication, models.Patient)
            .join(models.Medication, models.Schedule.medication_id == models.Medication.id)
            .join(models.Patient, models.Medication.patient_id == models.Patient.id)
            .filter(
                text("TO_CHAR(schedules.scheduled_time, 'HH24:MI') = :ct")
            )
            .params(ct=current_time)
            .all()
        )

        for schedule, med, patient in rows:
            print(f"[SCHEDULER] Reminder: {patient.first_name} → {med.name}")

            # Create a DoseLog entry for this firing
            dose_log = models.DoseLog(
                schedule_id=schedule.id,
                scheduled_at=datetime.now(timezone.utc),
                is_taken=False,
            )
            db.add(dose_log)

            # Fire TTS via Celery
            generate_reminder_task.delay(
                patient_name=patient.first_name,
                medication_name=med.name,
                language=patient.language,
            )

        db.commit()
    except Exception as e:
        print(f"[SCHEDULER] Error: {e}")
    finally:
        db.close()


@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_schedules, "interval", seconds=60)
    scheduler.start()
    print("[SYSTEM] Scheduler started.")


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "online", "version": "2.0.0"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=schemas.UserResponse, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/auth/login", response_model=schemas.Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not auth.verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return {"access_token": auth.create_access_token(user.id)}

@app.get("/auth/me", response_model=schemas.UserResponse)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ── Patients ───────────────────────────────────────────────────────────────────

@app.post("/patients/", response_model=schemas.PatientResponse, status_code=201)
def create_patient(
    payload: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = models.Patient(**payload.model_dump(), caregiver_id=current_user.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@app.get("/patients/", response_model=List[schemas.PatientSummary])
def get_patients(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Patient)
        .filter(models.Patient.caregiver_id == current_user.id)
        .all()
    )

@app.get("/patients/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.delete("/patients/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()


# ── Medications ────────────────────────────────────────────────────────────────

@app.post("/medications/", response_model=schemas.MedicationResponse, status_code=201)
def create_medication(
    payload: schemas.MedicationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Ensure patient belongs to this caregiver
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == payload.patient_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    med_data = payload.model_dump(exclude={"reminder_time"})
    med = models.Medication(**med_data)
    db.add(med)
    db.flush()  # get med.id before committing

    # Auto-create a Schedule if reminder_time was supplied
    if payload.reminder_time:
        h, m = map(int, payload.reminder_time.split(":"))
        schedule = models.Schedule(
            medication_id=med.id,
            scheduled_time=dt_time(h, m),
        )
        db.add(schedule)

    db.commit()
    db.refresh(med)
    return med

@app.delete("/medications/{medication_id}", status_code=204)
def delete_medication(
    medication_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    med = (
        db.query(models.Medication)
        .join(models.Patient)
        .filter(models.Medication.id == medication_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()


# ── Schedules ──────────────────────────────────────────────────────────────────

@app.post("/schedules/", response_model=schemas.ScheduleResponse, status_code=201)
def create_schedule(
    payload: schemas.ScheduleCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    med = (
        db.query(models.Medication)
        .join(models.Patient)
        .filter(models.Medication.id == payload.medication_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    schedule = models.Schedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule

@app.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    schedule = (
        db.query(models.Schedule)
        .join(models.Medication)
        .join(models.Patient)
        .filter(models.Schedule.id == schedule_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()


# ── Dose Logs (adherence) ──────────────────────────────────────────────────────

@app.get("/dose-logs/{patient_id}", response_model=List[schemas.DoseLogResponse])
def get_dose_logs(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return all dose logs for a patient (latest 100)."""
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    logs = (
        db.query(models.DoseLog)
        .join(models.Schedule)
        .join(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .order_by(models.DoseLog.scheduled_at.desc())
        .limit(100)
        .all()
    )
    return logs

@app.post("/dose-logs/mark-taken", response_model=schemas.DoseLogResponse)
def mark_dose_taken(
    payload: schemas.DoseLogMark,
    db: Session = Depends(database.get_db),
):
    """
    Called by the mobile app when the patient confirms they took their dose.
    No JWT — patient app uses PIN. PIN is verified against the owning patient.
    """
    log = (
        db.query(models.DoseLog)
        .filter(models.DoseLog.id == payload.dose_log_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Dose log not found")

    # Walk up: DoseLog → Schedule → Medication → Patient
    patient = log.schedule.medication.patient
    if patient.pin_code != payload.pin_code:
        raise HTTPException(status_code=403, detail="Invalid PIN")

    log.is_taken = True
    log.taken_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(log)
    return log


# ── Adherence stats ────────────────────────────────────────────────────────────

@app.get("/adherence/{patient_id}", response_model=schemas.AdherenceStats)
def get_adherence(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id, models.Patient.caregiver_id == current_user.id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    logs = (
        db.query(models.DoseLog)
        .join(models.Schedule)
        .join(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .all()
    )

    total = len(logs)
    taken = sum(1 for l in logs if l.is_taken)
    missed = total - taken
    pct = round((taken / total * 100) if total else 0, 1)

    return schemas.AdherenceStats(
        patient_id=patient_id,
        patient_name=f"{patient.first_name} {patient.last_name}",
        total_doses=total,
        taken_doses=taken,
        missed_doses=missed,
        adherence_pct=pct,
    )


# ── TTS / Audio ────────────────────────────────────────────────────────────────

@app.get("/generate-audio/")
def generate_audio(text: str, lang: str = "he"):
    try:
        filepath = tts_service.generate_voice_reminder(text, lang)
        return FileResponse(filepath, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-background-worker/")
def test_worker(patient_name: str = "Saba", medication_name: str = "Aspirin", lang: str = "he"):
    task = generate_reminder_task.delay(patient_name, medication_name, lang)
    return {"message": "Task sent!", "task_id": task.id}