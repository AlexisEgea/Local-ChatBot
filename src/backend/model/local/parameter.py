"""Transformers generation knobs read from a local Hugging Face folder."""

from __future__ import annotations

import json
from pathlib import Path

from model.parameter import clamp_value


def transformers_chat_parameters(context_length: int | None) -> list[dict]:
    """Return generate() knobs. Weights are not loaded."""
    high = context_length or 4096
    return [
        {
            "id": "max_new_tokens",
            "label": "Max new tokens",
            "type": "integer",
            "min": 1,
            "max": high,
            "step": 1,
            "default": min(128, high),
        },
        {
            "id": "temperature",
            "label": "Temperature",
            "type": "number",
            "min": 0,
            "max": 2,
            "step": 0.05,
            "default": 0.7,
        },
        {
            "id": "top_p",
            "label": "Top p",
            "type": "number",
            "min": 0,
            "max": 1,
            "step": 0.05,
            "default": 0.9,
        },
        {
            "id": "top_k",
            "label": "Top k",
            "type": "integer",
            "min": 0,
            "max": 200,
            "step": 1,
            "default": 50,
        },
        {
            "id": "repetition_penalty",
            "label": "Repetition penalty",
            "type": "number",
            "min": 1,
            "max": 2,
            "step": 0.05,
            "default": 1,
        },
    ]


def read_folder_json(folder: Path, filename: str) -> dict:
    """Read a JSON object from the model folder, or {} when missing."""
    path = folder / filename
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def context_length_from_config(config: dict) -> int | None:
    """Return the advertised context window from config.json."""
    for key in ("max_position_embeddings", "max_sequence_length", "n_positions"):
        value = config.get(key)
        if isinstance(value, int) and value > 0:
            return value
    return None


def apply_generation_defaults(parameters: list[dict], config: dict) -> None:
    """Overlay generation_config.json onto the Transformers knobs."""
    aliases = {"max_tokens": "max_new_tokens", "max_length": "max_new_tokens"}
    for parameter in parameters:
        raw = config.get(parameter["id"])
        if raw is None:
            for hub_key, chat_key in aliases.items():
                if chat_key == parameter["id"] and hub_key in config:
                    raw = config[hub_key]
                    break
        if raw is None:
            continue
        try:
            parameter["default"] = clamp_value(parameter, raw)
        except ValueError:
            continue
