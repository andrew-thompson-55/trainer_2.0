import os
import google.generativeai as genai
from datetime import datetime
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from typing import List, Optional
from uuid import UUID

# Internal modules
from schemas import ChatRequest, WorkoutCreate, WorkoutResponse
from services import workout_service
from db_client import supabase_admin
from ai_tools import tools_schema, execute_tool_call

load_dotenv()

app = FastAPI()

# --- SETUP GEMINI SDK ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY missing from environment.")

# Clean the key just in case
api_key = api_key.strip()

# Configure the SDK
genai.configure(api_key=api_key)


@app.get("/")
def health_check():
    return {"status": "Chimera is Online"}


# --- AI CHAT ENDPOINT (With Tools) ---
@app.post("/v1/chat")
async def chat_with_gemini(request: ChatRequest):
    try:
        # 1. Initialize Model with Tools
        # We use 'gemini-2.5-flash' because it has the best support for Function Calling
        model = genai.GenerativeModel(model_name="gemini-2.5-flash", tools=tools_schema)

        # 2. Define System Context
        current_time = datetime.now().isoformat()
        system_instructions = f"""
        You are Chimera, an expert endurance training coach.
        The current date and time is: {current_time}.
        
        Your Goal: Help the user plan workouts and answer training questions.
        
        RULES:
        1. If the user asks to schedule, add, or plan a workout, YOU MUST use the 'create_workout' tool.
        2. Do not ask for confirmation if the user provides enough info (Type, Time). Just do it.
        3. If details are missing (e.g. "Schedule a run"), ask for the missing time or duration.
        """

        # 3. Start Chat Session
        # We start a chat history so the bot knows the system instructions
        chat = model.start_chat(
            history=[
                {"role": "user", "parts": system_instructions},
                {"role": "model", "parts": "Understood. I am ready to coach."},
            ]
        )

        # 4. Send User Message
        response = chat.send_message(request.message)

        # 5. Check for Function Calls
        final_reply = ""

        # The SDK returns candidates. We check the first one.
        part = response.candidates[0].content.parts[0]

        # If the AI wants to run a function (Tool):
        if part.function_call:
            # 5a. Extract function details
            fname = part.function_call.name
            fargs = dict(part.function_call.args)

            # 5b. Execute the Tool (Run your Python logic)
            # This calls the function in ai_tools.py which writes to Supabase
            tool_result = await execute_tool_call(fname, fargs)

            # 5c. Send Result back to Gemini
            # We must format the response exactly how the SDK expects it
            function_response = {
                "function_response": {
                    "name": fname,
                    "response": {"result": tool_result},
                }
            }

            # Send the tool output back to the model to get the final natural language response
            final_response = chat.send_message([function_response])
            final_reply = final_response.text
        else:
            # No tool used, just normal text
            final_reply = response.text

        # 6. Log Chat to Supabase (Fire and Forget)
        if supabase_admin:
            try:
                supabase_admin.table("chat_logs").insert(
                    {"user_message": request.message, "ai_response": final_reply}
                ).execute()
            except Exception as e:
                print(f"Logging failed: {e}")

        return {"reply": final_reply}

    except Exception as e:
        print(f"AI Error: {e}")
        # Return the specific error for debugging
        raise HTTPException(status_code=500, detail=str(e))


# --- WORKOUT ENDPOINTS (Unchanged) ---


@app.post("/v1/workouts", response_model=WorkoutResponse, tags=["Workouts"])
async def create_workout(workout: WorkoutCreate):
    return await workout_service.create_workout(workout)


@app.get("/v1/workouts", response_model=List[WorkoutResponse], tags=["Workouts"])
async def get_workouts(
    start_date: Optional[str] = None, end_date: Optional[str] = None
):
    return await workout_service.get_workouts(start_date, end_date)


@app.patch("/v1/workouts/{workout_id}", tags=["Workouts"])
async def update_workout(workout_id: UUID, workout: dict):
    return await workout_service.update_workout(workout_id, workout)


@app.delete("/v1/workouts/{workout_id}", tags=["Workouts"])
async def delete_workout(workout_id: UUID):
    await workout_service.delete_workout(workout_id)
    return {"status": "deleted"}
