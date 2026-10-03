"""Shared generation-parameter helpers."""

from __future__ import annotations

import os


def clamp_value(parameter: dict, raw: object):
    """Coerce one setting to the parameter type and range."""
    kind = parameter["type"]
    if kind == "boolean":
        if isinstance(raw, str):
            return raw.lower() in {"1", "true", "yes", "on"}
        return bool(raw)
    if kind == "select":
        allowed = {option["id"] for option in parameter["options"]}
        return raw if raw in allowed else parameter["default"]
    try:
        value = int(raw) if kind == "integer" else float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid {parameter['id']}") from error
    low = parameter.get("min")
    high = parameter.get("max")
    if low is not None:
        value = max(low, value)
    if high is not None:
        value = min(high, value)
    return value


def list_model_parameters(model_id: str) -> list[dict]:
    """Return the selected provider's generation fields for this model."""
    from model.registry import get_provider_for_model

    chosen = model_id.strip()
    if not chosen:
        raise ValueError("No model selected")
    return get_provider_for_model(chosen).list_parameters(chosen)


def sanitize_settings(model_id: str | None, settings: dict | None) -> tuple[str, dict]:
    """Keep a non-empty model id and clamp settings to that model's fields."""
    chosen = (model_id or os.getenv("DEFAULT_MODEL") or "").strip()
    if not chosen:
        raise ValueError("No model selected")

    incoming = settings or {}
    cleaned = {}
    for parameter in list_model_parameters(chosen):
        key = parameter["id"]
        raw = incoming[key] if key in incoming else parameter["default"]
        cleaned[key] = clamp_value(parameter, raw)
    return chosen, cleaned
