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
    # Get and validate API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server misconfigured: No API Key")

    api_key = api_key.strip()

    # Use the correct endpoint from official Gemini documentation
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    # Headers as specified in official documentation
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    # Payload format from official docs
    payload = {"contents": [{"parts": [{"text": request.message}]}]}

    try:
        # Make the request
        response = requests.post(url, headers=headers, json=payload, timeout=30)

        # Log for debugging
        print(f"Status Code: {response.status_code}")

        # Raise for HTTP errors
        response.raise_for_status()

        # Parse the response
        data = response.json()

        # Extract the text from the response
        reply_text = data["candidates"][0]["content"]["parts"][0]["text"]

        return {"reply": reply_text}

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP Error: {http_err}")
        print(f"Response Text: {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Gemini API error: {response.text}",
        )

    except KeyError as key_err:
        print(f"KeyError: {key_err}")
        print(f"Full Response: {response.text}")
        raise HTTPException(
            status_code=500, detail="Unexpected response format from Gemini API"
        )

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request to Gemini API timed out")

    except Exception as e:
        print(f"Unexpected Error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
