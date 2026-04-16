from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, time as dt_time, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from pydantic import BaseModel
import io

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
except ImportError:
    pass  # Ensure you run: pip install reportlab

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
                text("TO_CHAR(schedules.scheduled_time, 'HH24:MI') = :ct"),
                models.Schedule.active == True
            )
            .params(ct=current_time)
            .all()
        )

        for schedule, med, patient in rows:
            print(f"[SCHEDULER] Reminder: {patient.first_name} → {med.name}")

            # Create a DoseLog entry for this firing (defaults to missed until patient acts)
            dose_log = models.DoseLog(
                schedule_id=schedule.id,
                scheduled_at=datetime.now(timezone.utc),
                is_taken=False,
                status="missed" 
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

# ✅ NEW: Secure Mobile App Verification Payload
class MobileSyncPayload(BaseModel):
    patient_id: int
    pin_code: str

# ✅ NEW: Mobile Login/Sync Endpoint
@app.post("/patients/mobile-sync", response_model=schemas.PatientResponse)
def mobile_sync(payload: MobileSyncPayload, db: Session = Depends(database.get_db)):
    """Verifies the patient PIN from the mobile app and returns their data."""
    patient = db.query(models.Patient).filter(models.Patient.id == payload.patient_id).first()
    
    # Strictly verify existence and PIN
    if not patient or patient.pin_code != payload.pin_code:
        raise HTTPException(status_code=403, detail="Invalid Patient ID or PIN")
        
    return patient

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

# NEW: Escalation Contacts
@app.post("/patients/{patient_id}/escalation", response_model=schemas.EscalationContactResponse, status_code=201)
def create_escalation_contact(
    patient_id: int,
    payload: schemas.EscalationContactCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id, models.Patient.caregiver_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    contact = models.EscalationContact(**payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# ── Medications ────────────────────────────────────────────────────────────────

@app.post("/medications/", response_model=schemas.MedicationResponse, status_code=201)
def create_medication(
    payload: schemas.MedicationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
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
    db.flush() 

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

@app.put("/medications/{medication_id}/refill", response_model=schemas.MedicationResponse)
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
    log = (
        db.query(models.DoseLog)
        .filter(models.DoseLog.id == payload.dose_log_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Dose log not found")

    patient = log.schedule.medication.patient
    if patient.pin_code != payload.pin_code:
        raise HTTPException(status_code=403, detail="Invalid PIN")

    # Update logic for new schema
    log.status = payload.status
    log.skip_reason = payload.skip_reason
    log.taken_at = datetime.now(timezone.utc)
    
    if payload.status == "taken":
        log.is_taken = True
        # Decrement inventory pill count if taken
        if log.schedule.medication.pill_count > 0:
            log.schedule.medication.pill_count -= 1
    else:
        log.is_taken = False

    db.commit()
    db.refresh(log)
    return log


# ── Adherence stats & Reporting ────────────────────────────────────────────────

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

@app.get("/patients/{patient_id}/adherence/heatmap")
def get_adherence_heatmap(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Returns a 30-day summary of taken vs missed doses for a GitHub-style heatmap."""
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id, 
        models.Patient.caregiver_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=30)

    logs = (
        db.query(models.DoseLog)
        .join(models.Schedule)
        .join(models.Medication)
        .filter(
            models.Medication.patient_id == patient_id,
            models.DoseLog.scheduled_at >= datetime.combine(start_date, dt_time.min).replace(tzinfo=timezone.utc)
        )
        .all()
    )

    heatmap_data = {}
    for i in range(31):
        day_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        heatmap_data[day_str] = {"total": 0, "taken": 0, "missed": 0, "skipped": 0}

    for log in logs:
        log_date = log.scheduled_at.date().strftime("%Y-%m-%d")
        if log_date in heatmap_data:
            heatmap_data[log_date]["total"] += 1
            if log.status == "taken":
                heatmap_data[log_date]["taken"] += 1
            elif log.status == "skipped":
                heatmap_data[log_date]["skipped"] += 1
            else:
                heatmap_data[log_date]["missed"] += 1

    return {"patient_id": patient_id, "heatmap": heatmap_data}

@app.get("/patients/{patient_id}/report/pdf")
def download_doctor_report(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Generates a downloadable PDF report for a doctor visit."""
    patient = db.query(models.Patient).filter(
        models.Patient.id == patient_id, 
        models.Patient.caregiver_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    start_date = datetime.now(timezone.utc) - timedelta(days=30)
    logs = db.query(models.DoseLog).join(models.Schedule).join(models.Medication).filter(
        models.Medication.patient_id == patient_id,
        models.DoseLog.scheduled_at >= start_date
    ).order_by(models.DoseLog.scheduled_at.desc()).limit(50).all()

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    
    p.drawString(50, 750, f"MedRemind - Adherence Report")
    p.setFont("Helvetica", 12)
    p.drawString(50, 730, f"Patient Name: {patient.first_name} {patient.last_name}")
    p.drawString(50, 710, f"Report Date: {datetime.now().strftime('%Y-%m-%d')}")
    p.line(50, 700, 550, 700)

    y_position = 670
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, y_position, "Recent Medication Logs (Last 30 Days):")
    y_position -= 20
    
    p.setFont("Helvetica", 10)
    for log in logs:
        if y_position < 50: 
            p.showPage()
            y_position = 750
            p.setFont("Helvetica", 10)
            
        med_name = log.schedule.medication.name
        date_str = log.scheduled_at.strftime("%b %d, %Y - %H:%M")
        status_text = log.status.upper()
        reason = f"(Reason: {log.skip_reason})" if log.skip_reason else ""
        
        line_text = f"• {date_str} | {med_name} | Status: {status_text} {reason}"
        p.drawString(60, y_position, line_text)
        y_position -= 15

    p.line(50, y_position - 10, 550, y_position - 10)
    p.drawString(50, y_position - 30, "Generated by MedRemind Caregiver Platform")
    p.drawString(50, y_position - 50, "Doctor's Signature: ___________________________")

    p.showPage()
    p.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=medremind_report_{patient.first_name}.pdf"}
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