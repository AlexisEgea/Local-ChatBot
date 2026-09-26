"""Resolve the provider that owns a selected model id."""

from __future__ import annotations

import os

from model.huggingface.provider import HuggingFaceProvider
from model.local.provider import LocalProvider
from model.provider import Provider
from model.test.provider import TestProvider

_huggingface = HuggingFaceProvider()
_local = LocalProvider()
_test = TestProvider()

# Sidebar order.
PANEL_PROVIDERS: tuple[Provider, ...] = (_huggingface, _local, _test)
# Specific catalogs first; Hugging Face accepts remaining ids.
RESOLVE_PROVIDERS: tuple[Provider, ...] = (_test, _local, _huggingface)


def get_registered_providers() -> tuple[Provider, ...]:
    """Return providers in sidebar order."""
    return PANEL_PROVIDERS


def get_provider_by_id(provider_id: str) -> Provider:
    """Return a registered provider by its id."""
    chosen = (provider_id or "").strip()
    for provider in PANEL_PROVIDERS:
        if provider.id == chosen:
            return provider
    raise ValueError(f"No provider: {chosen}")


def get_provider_for_model(model_id: str) -> Provider:
    """Return the provider that owns this model id."""
    chosen = (model_id or "").strip()
    if not chosen:
        raise ValueError("No model selected")
    for provider in RESOLVE_PROVIDERS:
        if provider.owns_model(chosen):
            return provider
    raise ValueError(f"No provider for model: {chosen}")


def get_resolved_provider(model_id: str | None = None) -> tuple[Provider, str]:
    """Resolve DEFAULT_MODEL when no id is given, then pick the owning provider."""
    chosen = (model_id or os.getenv("DEFAULT_MODEL") or "").strip()
    return get_provider_for_model(chosen), chosen
