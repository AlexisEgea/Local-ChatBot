"""Models currently reachable via Hugging Face Inference Providers."""

from __future__ import annotations

import os
import time

from model.client import create_client
from model.sources.model_repo import repo_id

HF_PROVIDER_ID = "huggingface"
HF_PROVIDER_LABEL = "Hugging Face"
CACHE_TTL_SECONDS = 300

_cached_models: tuple[float, list[dict]] | None = None


def _company_id(item, model_id: str) -> str:
    """Return the model publisher (owned_by, or the Hub org in the id)."""
    owned = getattr(item, "owned_by", None)
    if owned:
        return str(owned)
    repo = repo_id(model_id)
    if "/" in repo:
        return repo.split("/", 1)[0]
    return repo


def _model_label(model_id: str) -> str:
    """Return the model name without org or provider suffix."""
    return repo_id(model_id).rsplit("/", 1)[-1]


def _provider_context_length(item) -> int | None:
    """Return the largest context window advertised by inference providers."""
    providers = getattr(item, "providers", None) or []
    lengths = []
    for provider in providers:
        length = (
            provider.get("context_length")
            if isinstance(provider, dict)
            else getattr(provider, "context_length", None)
        )
        if length:
            lengths.append(int(length))
    return max(lengths) if lengths else None


def listed_models() -> list[dict]:
    """Return the cached provider model list, refreshing it when stale."""
    global _cached_models
    now = time.monotonic()
    if _cached_models is None or now - _cached_models[0] >= CACHE_TTL_SECONDS:
        _cached_models = (now, _fetch_provider_models())
    return _cached_models[1]


def context_length_for(model_id: str) -> int | None:
    """Return the advertised context window for a listed model id."""
    for model in listed_models():
        if model["id"] == model_id:
            return model.get("context_length")
    return None


def _fetch_provider_models() -> list[dict]:
    """Ask the inference provider for every model it currently exposes."""
    models = []
    seen = set()
    for item in create_client().models.list():
        model_id = getattr(item, "id", None)
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        models.append({
            "id": model_id,
            "label": _model_label(model_id),
            "provider": HF_PROVIDER_ID,
            "company": _company_id(item, model_id),
            "context_length": _provider_context_length(item),
        })
    models.sort(key=lambda model: model["id"].lower())
    return models


def list_model_options() -> dict:
    """Return providers, companies, and models for the Model panel."""
    models = listed_models()
    if not models:
        raise RuntimeError("The inference provider returned no models")

    companies: dict[str, dict] = {}
    for model in models:
        company_id_value = model["company"]
        company = companies.setdefault(
            company_id_value,
            {"id": company_id_value, "label": company_id_value, "models": []},
        )
        company["models"].append({
            "id": model["id"],
            "label": model["label"],
            "context_length": model.get("context_length"),
        })

    for company in companies.values():
        company["models"].sort(key=lambda model: model["label"].lower())

    company_list = sorted(companies.values(), key=lambda company: company["id"].lower())
    env_default = (os.getenv("DEFAULT_MODEL") or "").strip()
    ids = {model["id"] for model in models}
    default_id = env_default if env_default in ids else models[0]["id"]
    return {
        "default_id": default_id,
        "providers": [
            {
                "id": HF_PROVIDER_ID,
                "label": HF_PROVIDER_LABEL,
                "companies": company_list,
            }
        ],
    }
