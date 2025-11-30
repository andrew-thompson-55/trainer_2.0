import os
import requests
from fastapi import FastAPI, HTTPException
from schemas import ChatRequest
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()


@app.get("/")
def health_check():
    return {"status": "Chimera is Online"}


@app.post("/v1/chat")
async def chat_with_gemini(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server misconfigured: No API Key")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
    headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}
    data = {"contents": [{"parts": [{"text": request.message}]}]}

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return {
            "reply": response.json()["candidates"][0]["content"]["parts"][0]["text"]
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
