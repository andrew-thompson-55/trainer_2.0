import os
import logging
import google.generativeai as genai
from db_client import supabase_admin
from ai_tools import tools_schema, execute_tool_call
from services.context_service import build_agent_context, format_context_for_prompt

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 6


def _build_system_prompt(context_text: str) -> str:
    """Build the full system prompt with training context injected."""
    return f"""You are Chimera, an expert endurance training coach powered by AI.

ATHLETE CONTEXT:
{context_text}

COACHING PHILOSOPHY:
You are a thoughtful, data-driven coach. Before making changes to the training plan:
1. PLAN: Consider the athlete's current state -- wellness data, recent training load, upcoming schedule, and goals.
2. ACT: Use tools to query data and make changes. Chain multiple tool calls when needed (e.g., check schedule before moving a workout).
3. REFLECT: Verify tool results before responding. If a tool returns an error, explain what happened and suggest alternatives.

RULES:
1. When the user asks for a time (e.g. "6am"), ALWAYS append the timezone offset from the TIMEZONE info above.
2. If the user asks to schedule, add, or plan a workout, use the 'create_workout' tool.
3. Before modifying workouts, use 'get_upcoming_workouts' to verify the current schedule.
4. If you notice concerning patterns in wellness data (poor sleep, high soreness, declining HRV), proactively flag them.
5. Use 'save_coach_note' to remember important observations about the athlete across sessions.
6. When asked about past training, use the read tools to fetch actual data rather than guessing.
7. Be concise and actionable in your responses. Athletes want clear guidance, not essays."""


async def _load_chat_history(user_id: str, limit: int = 10) -> list:
    """Load recent chat history for conversation context."""
    try:
        response = (
            supabase_admin.table("chat_logs")
            .select("user_message, ai_response")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        if not response.data:
            return []

        # Reverse to oldest-first for Gemini history
        history_pairs = []
        for entry in reversed(response.data):
            history_pairs.append(
                {"role": "user", "parts": [entry["user_message"]]}
            )
            history_pairs.append(
                {"role": "model", "parts": [entry["ai_response"]]}
            )
        return history_pairs
    except Exception as e:
        logger.warning(f"Failed to load chat history: {e}")
        return []


async def run_agent(user_id: str, user_message: str) -> dict:
    """
    Main agent entry point implementing Plan-Act-Reflect loop.

    Returns: {"reply": str, "tools_used": list, "iterations": int}
    """
    tools_used = []

    # --- PLAN PHASE ---
    # 1. Build training context
    context = await build_agent_context(user_id)
    context_text = format_context_for_prompt(context)
    system_prompt = _build_system_prompt(context_text)

    # 2. Load chat history
    chat_history = await _load_chat_history(user_id)

    # 3. Build initial history with system prompt
    initial_history = [
        {"role": "user", "parts": [system_prompt]},
        {"role": "model", "parts": ["Understood. I'm ready to coach with full context of the athlete's training state."]},
    ]
    initial_history.extend(chat_history)

    # --- ACT PHASE ---
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        tools=tools_schema,
    )
    chat = model.start_chat(history=initial_history)
    response = chat.send_message(user_message)

    final_reply = ""
    iteration = 0

    while iteration < MAX_ITERATIONS:
        iteration += 1

        if not response.candidates:
            final_reply = "I'm sorry, I couldn't generate a response. Please try again."
            break

        parts = response.candidates[0].content.parts

        # Collect all function calls from this response
        function_calls = [p for p in parts if p.function_call and p.function_call.name]

        # If no function calls, extract text and we're done
        if not function_calls:
            text_parts = [p.text for p in parts if hasattr(p, "text") and p.text]
            final_reply = "\n".join(text_parts) if text_parts else "I've completed the requested actions."
            break

        # Execute all function calls (parallel within this iteration)
        function_responses = []
        for fc_part in function_calls:
            fname = fc_part.function_call.name
            fargs = dict(fc_part.function_call.args)

            try:
                tool_result = await execute_tool_call(fname, fargs, user_id)
                tools_used.append(fname)
            except Exception as e:
                # --- REFLECT: Feed errors back so Gemini can retry or explain ---
                logger.error(f"Tool execution error ({fname}): {e}")
                tool_result = {"status": "error", "message": str(e)}

            function_responses.append({
                "function_response": {
                    "name": fname,
                    "response": {"result": tool_result},
                }
            })

        # Send all tool results back to Gemini for next iteration
        response = chat.send_message(function_responses)

    else:
        # Hit max iterations -- graceful fallback
        text_parts = [p.text for p in response.candidates[0].content.parts if hasattr(p, "text") and p.text] if response.candidates else []
        final_reply = "\n".join(text_parts) if text_parts else "I've processed your request but hit a complexity limit. Here's what I did so far."

    # --- LOG PHASE ---
    if supabase_admin:
        try:
            supabase_admin.table("chat_logs").insert(
                {
                    "user_id": user_id,
                    "user_message": user_message,
                    "ai_response": final_reply,
                }
            ).execute()
        except Exception as e:
            logger.warning(f"Chat log failed: {e}")

    return {
        "reply": final_reply,
        "tools_used": tools_used,
        "iterations": iteration,
    }
