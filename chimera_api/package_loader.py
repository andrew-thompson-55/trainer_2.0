"""
Package loader for trainer packages.

Reads the trainer package specified by TRAINER_PACKAGE env var (default: ../packages/default)
and caches all configuration at import time.
"""

import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Resolve package path
_package_dir = Path(
    os.getenv("TRAINER_PACKAGE", os.path.join(os.path.dirname(__file__), "..", "packages", "default"))
).resolve()

REQUIRED_FILES = [
    "package.json",
    "persona.json",
    "config.json",
    "colors.json",
    "strings.json",
    "checkin.json",
    "system-prompt.md",
]

# Required keys per file for schema validation
REQUIRED_KEYS = {
    "package.json": ["name", "displayName", "version"],
    "persona.json": [
        "coachName", "coachDisplayName", "coachGreeting", "chatPlaceholder",
        "chatNoResponse", "chatErrorMessage", "chatProcessError", "chatNetworkError",
        "agentReadyMessage", "agentNoResponseError", "agentFallbackMessage",
        "agentMaxIterationMessage", "defaultUserName",
    ],
    "config.json": [
        "healthCheckMessage", "defaultTimezone", "storageKeyPrefix",
        "activityTypes", "defaultActivityType", "defaultWeightUnit",
        "notificationDefaults", "stravaTypeMap", "calendar",
    ],
    "colors.json": ["light", "dark", "activity", "checkin", "coach", "login", "dashboard"],
    "checkin.json": ["metrics", "rpeOptions", "scaleColorKeys", "rpeScaleColorKeys"],
}


def _load_json(filename: str) -> dict:
    filepath = _package_dir / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_text(filename: str) -> str:
    filepath = _package_dir / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _validate():
    """Validate that all required package files exist and contain required keys."""
    # Check files exist
    missing_files = [f for f in REQUIRED_FILES if not (_package_dir / f).exists()]
    if missing_files:
        raise FileNotFoundError(
            f"Trainer package at '{_package_dir}' is missing required files: {missing_files}"
        )

    # Check required keys in JSON files
    errors = []
    for filename, required_keys in REQUIRED_KEYS.items():
        try:
            data = _load_json(filename)
            missing_keys = [k for k in required_keys if k not in data]
            if missing_keys:
                errors.append(f"{filename} missing keys: {missing_keys}")
        except json.JSONDecodeError as e:
            errors.append(f"{filename} is not valid JSON: {e}")

    # Check system prompt has required placeholders
    try:
        prompt = _load_text("system-prompt.md")
        if "{coachName}" not in prompt:
            errors.append("system-prompt.md missing {coachName} placeholder")
        if "{contextText}" not in prompt:
            errors.append("system-prompt.md missing {contextText} placeholder")
    except Exception as e:
        errors.append(f"system-prompt.md read error: {e}")

    if errors:
        raise ValueError(
            f"Trainer package validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
        )


# Validate and load at import time
_validate()
logger.info(f"Loading trainer package from: {_package_dir}")

_meta = _load_json("package.json")
_persona = _load_json("persona.json")
_config = _load_json("config.json")
_colors = _load_json("colors.json")
_strings = _load_json("strings.json")
_checkin = _load_json("checkin.json")
_system_prompt_template = _load_text("system-prompt.md")


def get_meta() -> dict:
    return _meta


def get_persona() -> dict:
    return _persona


def get_config() -> dict:
    return _config


def get_colors() -> dict:
    return _colors


def get_strings() -> dict:
    return _strings


def get_checkin() -> dict:
    return _checkin


def get_system_prompt() -> str:
    """Return the raw system prompt template with {coachName} and {contextText} placeholders."""
    return _system_prompt_template
