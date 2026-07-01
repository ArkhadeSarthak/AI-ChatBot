from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
from routes.voice import router as voice_router

app = FastAPI(title="A! ChatBot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-User-Text", "X-AI-Reply"],
)

app.include_router(chat_router)
app.include_router(voice_router)


@app.get("/")
def default():
    return {"message": "\nHow can I help you today?"}
