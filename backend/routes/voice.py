import os
import uuid
import tempfile
import urllib.parse

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from services.stt_service import speech_to_text
from services.ai_service import get_ai_response
from services.tts_service import generate_voice

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "chatbot_uploads")
OUTPUT_DIR = os.path.join(tempfile.gettempdir(), "chatbot_outputs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

router = APIRouter(
    prefix="/voice",
    tags=["Voice Assistant"]
)

@router.post("/")
async def voice_chat(audio: UploadFile = File(...)):
    audio_id = str(uuid.uuid4())
    ext = os.path.splitext(audio.filename)[1] or ".webm"
    audio_path = os.path.join(UPLOAD_DIR, f"{audio_id}{ext}")
    output_audio = os.path.join(OUTPUT_DIR, f"{audio_id}.mp3")

    try:
        with open(audio_path, "wb") as f:
            f.write(await audio.read())

        user_text = speech_to_text(audio_path)
        print(f"DEBUG VOICE: Transcribed Text = '{user_text}'")
        
        if not user_text.strip():
            ai_reply = "I'm sorry, I couldn't hear any speech. Please try speaking again."
        else:
            ai_reply = get_ai_response(user_text)
            
        print(f"DEBUG VOICE: AI Reply = '{ai_reply}'")

        await generate_voice(ai_reply, output_audio)

        headers = {
            "X-User-Text": urllib.parse.quote(user_text),
            "X-AI-Reply": urllib.parse.quote(ai_reply)
        }

        return FileResponse(
            output_audio,
            media_type="audio/mpeg",
            filename="reply.mp3",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text")
async def voice_to_text(audio: UploadFile = File(...)):
    path = os.path.join(UPLOAD_DIR, audio.filename)
    
    try:
        with open(path, "wb") as f:
            f.write(await audio.read())

        text = speech_to_text(path)
        
        if not text.strip():
            ai_reply = "I'm sorry, I couldn't hear any speech. Please try speaking again."
        else:
            ai_reply = get_ai_response(text)

        return {
            "user_text": text,
            "ai_reply": ai_reply
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))