import os
import logging
from stream_chat import StreamChat

logger = logging.getLogger(__name__)

STREAM_API_KEY = os.getenv("STREAM_API_KEY", "")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET", "")

BOT_USER_ID = "chimera-ai"
BOT_USER_NAME = "Chimera"

_client = None


def get_stream_client() -> StreamChat:
    global _client
    if _client is None:
        _client = StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)
    return _client


def bootstrap_bot_user():
    """Idempotent upsert for the chimera-ai bot user. Called at app startup."""
    client = get_stream_client()
    client.upsert_user({
        "id": BOT_USER_ID,
        "name": BOT_USER_NAME,
        "role": "admin",
    })
    logger.info("Stream bot user bootstrapped")


def upsert_stream_user(user_id: str, name: str, email: str):
    """Sync a Chimera user to GetStream."""
    client = get_stream_client()
    client.upsert_user({
        "id": user_id,
        "name": name,
        "email": email,
    })


def generate_user_token(user_id: str) -> str:
    """Create a client-side Stream token for the given user."""
    client = get_stream_client()
    return client.create_token(user_id)


def get_or_create_coach_channel(user_id: str):
    """Return the deterministic coach channel for a user, creating if needed."""
    client = get_stream_client()
    channel = client.channel("messaging", f"coach-{user_id}", data={
        "members": [user_id, BOT_USER_ID],
        "created_by_id": BOT_USER_ID,
    })
    channel.create(BOT_USER_ID)
    return channel


def push_ai_message(channel, text: str):
    """Send the final Gemini reply as the bot user."""
    channel.send_message({"text": text}, BOT_USER_ID)


def send_typing_start(channel):
    """Send typing indicator start event."""
    channel.send_event({"type": "typing.start"}, BOT_USER_ID)


def send_typing_stop(channel):
    """Send typing indicator stop event."""
    channel.send_event({"type": "typing.stop"}, BOT_USER_ID)
