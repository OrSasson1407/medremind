from gtts import gTTS
import os
import uuid

# Create a temporary folder to store the generated MP3 files
AUDIO_DIR = "temp_audio"
if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR)

def generate_voice_reminder(text: str, language: str) -> str:
    """
    Generates an MP3 file from text in the specified language.
    Returns the exact file path to the audio file.
    """
    # gTTS has a specific quirk: it uses 'iw' for Hebrew instead of 'he'
    lang_map = {
        "en": "en",
        "he": "iw", 
        "ar": "ar"
    }
    
    # Default to English if something goes wrong
    tts_lang = lang_map.get(language, "en")
    
    # Generate the audio
    tts = gTTS(text=text, lang=tts_lang, slow=False)
    
    # Give the file a random, unique name so they don't overwrite each other
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    # Save the file to our hard drive
    tts.save(filepath)
    
    return filepath