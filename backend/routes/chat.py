from fastapi import APIRouter
from schemas.chat_schema import ChatRequest
from services.ai_service import get_ai_response

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

@router.get("/")
def chat_get():
    return {
        "message": "Send a POST request with a JSON body containing 'message'"
    }

@router.post("/")
def chat_post(data: ChatRequest):
    try:
        print("DEBUG INPUT:", data)

        ai_reply = get_ai_response(data.message)

        return {
            "user_message": data.message,
            "ai_reply": ai_reply
        }

    except Exception as e:
        print("🔥 CHAT ERROR:", repr(e))
        return {"error": str(e)}