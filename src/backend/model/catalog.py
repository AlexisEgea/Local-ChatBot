"""Assemble provider model lists for the Model panel."""

import os

from model.huggingface.constant import DEFAULT_MODEL_ID
from model.registry import get_registered_providers


def get_default_id(provider: dict) -> str | None:
    """Return DEFAULT_MODEL when it belongs to this provider, else the first model id."""
    ids: list[str] = []
    for company in provider.get("companies") or []:
        for model in company.get("models") or []:
            model_id = model.get("id")
            if model_id:
                ids.append(model_id)
    if not ids:
        return None
    env_default = (os.getenv("DEFAULT_MODEL") or "").strip()
    if env_default in ids:
        return env_default
    if provider.get("id") == "huggingface":
        wanted = DEFAULT_MODEL_ID.lower()
        for model_id in ids:
            lowered = model_id.lower()
            if lowered == wanted or lowered.startswith(f"{wanted}:"):
                return model_id
    return ids[0]


def list_model_options() -> dict:
    """Return providers, companies, and models for the Model panel."""
    providers: list[dict] = []
    default_id = None

    for provider in get_registered_providers():
        entry = provider.get_panel_entry()
        if not entry:
            continue
        providers.append(entry)
        if default_id is None:
            default_id = get_default_id(entry)

    return {
        "default_id": default_id,
        "providers": providers,
    }
