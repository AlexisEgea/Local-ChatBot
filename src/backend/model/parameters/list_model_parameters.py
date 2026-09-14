"""List of generation parameters for one model (inference + repository)."""

from __future__ import annotations

import os
import time

from model.sources.available_models import CACHE_TTL_SECONDS, context_length_for
from model.sources.model_repo import repo_id, repo_json, repo_tags
from model.parameters.inference_model_parameters import (
    huggingface_chat_parameters,
    reasoning_parameter,
    supports_reasoning,
)
from model.parameters.repository_model_parameters import apply_hub_defaults, clamp_value

_cached_parameters: dict[str, tuple[float, list[dict]]] = {}


def list_model_parameters(model_id: str) -> list[dict]:
    """Return inference knobs with repository defaults, plus reasoning when supported."""
    chosen = model_id.strip()
    if not chosen:
        raise ValueError("No model selected")

    now = time.monotonic()
    cached = _cached_parameters.get(chosen)
    if cached is not None and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    hub_repo = repo_id(chosen)
    context_length = context_length_for(chosen)
    config = repo_json(hub_repo, "generation_config.json") or {}
    parameters = huggingface_chat_parameters(context_length)
    apply_hub_defaults(parameters, config)

    if supports_reasoning(chosen, repo_tags(hub_repo)):
        parameters.append(reasoning_parameter())

    _cached_parameters[chosen] = (now, parameters)
    return parameters


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
