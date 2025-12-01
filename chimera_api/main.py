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

    api_key = api_key.strip()

    # streamGenerateContent without alt=sse returns JSON array
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": request.message}]}]}

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()

        result = response.json()
        # The response is an array of chunks, get the last one
        full_text = "".join(
            chunk["candidates"][0]["content"]["parts"][0]["text"]
            for chunk in result
            if "candidates" in chunk
        )

        return {"reply": full_text}

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {response.text}")
        raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
