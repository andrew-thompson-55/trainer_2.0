import os
import logging

logger = logging.getLogger(__name__)

_posthog = None

def _init():
    global _posthog
    api_key = os.getenv("POSTHOG_API_KEY")
    if not api_key:
        logger.info("POSTHOG_API_KEY not set -- analytics disabled")
        return
    try:
        import posthog
        posthog.api_key = api_key
        posthog.host = "https://us.i.posthog.com"
        _posthog = posthog
        logger.info("PostHog analytics initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize PostHog: {e}")

_init()


def track(user_id: str, event: str, properties: dict | None = None):
    """Capture an analytics event. Silent on failure."""
    if not _posthog:
        return
    try:
        _posthog.capture(user_id, event, properties or {})
    except Exception as e:
        logger.warning(f"Analytics track failed: {e}")


def shutdown():
    """Flush pending events on app shutdown."""
    if not _posthog:
        return
    try:
        _posthog.shutdown()
    except Exception as e:
        logger.warning(f"Analytics shutdown failed: {e}")
