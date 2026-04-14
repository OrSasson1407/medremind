from celery import Celery
import tts_service
import os

# Connect Celery to the Redis container running in Docker
celery_app = Celery(
    "medremind_worker",
    broker="redis://127.0.0.1:6379/0",
    backend="redis://127.0.0.1:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jerusalem",
    enable_utc=True,
)

@celery_app.task(name="generate_reminder")
def generate_reminder_task(patient_name: str, medication_name: str, language: str):
    """
    This task runs in the background. It generates the TTS audio file.
    """
    # Create the script based on language
    if language == "he":
        text = f"שלום {patient_name}, הגיע הזמן לקחת את התרופה שלך: {medication_name}."
    elif language == "ar":
        text = f"مرحباً {patient_name}، حان وقت تناول الدواء: {medication_name}."
    else:
        text = f"Hello {patient_name}, it is time to take your medication: {medication_name}."

    # Call our existing TTS service
    filepath = tts_service.generate_voice_reminder(text, language)
    
    print(f"[CELERY WORKER] Successfully generated audio reminder: {filepath}")
    return filepath