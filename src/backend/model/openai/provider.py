"""Paid OpenAI catalog, parameters, and chat."""

from __future__ import annotations

import os
import time

from openai import OpenAI

from model.openai.constant import (
    API_BASE_URL,
    CACHE_TTL_SECONDS,
    COMPANY_ID,
    CREATE_KEYS,
    DEFAULT_CONTEXT_LENGTH,
    DEFAULT_MODEL_ID,
    PROVIDER_ID,
    PROVIDER_LABEL,
)
from model.openai.parameter import openai_chat_parameters, supports_reasoning
from model.parameter import sanitize_settings
from model.provider import Provider


class OpenAIProvider(Provider):
    """Models billed through platform.openai.com."""

    id = PROVIDER_ID
    label = PROVIDER_LABEL

    def __init__(self) -> None:
        super().__init__()
        self._cached_models: tuple[float, list[dict]] | None = None
        self._cached_parameters: dict[str, tuple[float, list[dict]]] = {}
        self.last_usage: dict[str, int] | None = None

    def create_client(self) -> OpenAI:
        """Build the official OpenAI client."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is missing. Add an OpenAI API key from "
                "https://platform.openai.com/api-keys in the Local LLM Chat User Interface API key popup."
            )
        return OpenAI(api_key=api_key, base_url=API_BASE_URL)

    def owns_model(self, model_id: str) -> bool:
        """Claim ids returned by the OpenAI catalog, before Hugging Face's catch-all."""
        chosen = (model_id or "").strip()
        if not chosen:
            return False
        try:
            return any(model["id"] == chosen for model in self.listed_models())
        except Exception:
            return False

    def listed_models(self) -> list[dict]:
        """Return the cached OpenAI model list, refreshing it when stale."""
        now = time.monotonic()
        if self._cached_models is None or now - self._cached_models[0] >= CACHE_TTL_SECONDS:
            self._cached_models = (now, self._fetch_provider_models())
        return self._cached_models[1]

    def list_parameters(self, model_id: str) -> list[dict]:
        """Return chat knobs, with reasoning effort when the model supports it."""
        now = time.monotonic()
        cached = self._cached_parameters.get(model_id)
        if cached is not None and now - cached[0] < CACHE_TTL_SECONDS:
            return cached[1]
        parameters = openai_chat_parameters(model_id, self.get_context_length(model_id))
        self._cached_parameters[model_id] = (now, parameters)
        return parameters

    def complete_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        settings: dict | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Send chat messages to the paid OpenAI API."""
        model_id, cleaned = sanitize_settings(model, settings)
        if max_tokens is not None:
            cleaned["max_tokens"] = max_tokens

        if supports_reasoning(model_id) and "max_tokens" in cleaned:
            cleaned["max_completion_tokens"] = cleaned.pop("max_tokens")

        create_kwargs = {key: cleaned[key] for key in CREATE_KEYS if key in cleaned}
        output = self.create_client().chat.completions.create(
            model=model_id,
            messages=messages,
            **create_kwargs,
        )
        usage = getattr(output, "usage", None)
        self.last_usage = None
        if usage is not None:
            self.last_usage = {
                "prompt_tokens": int(getattr(usage, "prompt_tokens", 0) or 0),
                "completion_tokens": int(getattr(usage, "completion_tokens", 0) or 0),
            }
        message = output.choices[0].message
        content = (message.content or "").strip()
        if content:
            return content
        reasoning = getattr(message, "reasoning", None) or getattr(message, "reasoning_content", None)
        return (reasoning or "").strip()

    def get_panel_entry(self) -> dict | None:
        """Put gpt-4o-mini first in the OpenAI model list."""
        entry = super().get_panel_entry()
        if not entry:
            return None
        wanted = DEFAULT_MODEL_ID.lower()
        for company in entry["companies"]:
            company["models"].sort(
                key=lambda model: (0 if (model.get("id") or "").lower() == wanted else 1, model["label"].lower())
            )
        return entry

    def _fetch_provider_models(self) -> list[dict]:
        """Ask OpenAI for every model the current key can list."""
        models = []
        seen = set()
        for item in self.create_client().models.list():
            model_id = getattr(item, "id", None)
            if not model_id or model_id in seen:
                continue
            seen.add(model_id)
            context_length = getattr(item, "context_window", None) or getattr(item, "context_length", None)
            models.append(
                {
                    "id": model_id,
                    "label": model_id,
                    "provider": self.id,
                    "company": COMPANY_ID,
                    "context_length": int(context_length) if context_length else DEFAULT_CONTEXT_LENGTH,
                }
            )
        models.sort(key=lambda model: model["id"].lower())
        return models
