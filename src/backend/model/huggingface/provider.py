"""Hugging Face Inference Providers catalog, parameters, and chat."""

from __future__ import annotations

import os
import time

from openai import OpenAI

from model.huggingface.constant import (
    API_BASE_URL,
    CACHE_TTL_SECONDS,
    OPENAI_CREATE_KEYS,
    PROVIDER_ID,
    PROVIDER_LABEL,
    REQUEST_KEY_ALIASES,
)
from model.huggingface.parameter import (
    apply_hub_defaults,
    huggingface_chat_parameters,
    reasoning_parameter,
    supports_reasoning,
)
from model.huggingface.repo import repo_id, repo_json, repo_tags
from model.provider import Provider


class HuggingFaceProvider(Provider):
    """Models reachable via the Hugging Face router."""

    id = PROVIDER_ID
    label = PROVIDER_LABEL

    def __init__(self) -> None:
        super().__init__()
        self._cached_models: tuple[float, list[dict]] | None = None
        self._cached_parameters: dict[str, tuple[float, list[dict]]] = {}

    def create_client(self) -> OpenAI:
        """Build an OpenAI-compatible client pointed at Hugging Face's router."""
        api_key = os.getenv("HF_TOKEN")
        if not api_key:
            raise RuntimeError(
                "HF_TOKEN is missing. Copy infra/.env.example to infra/env and add a Hugging Face "
                "token with Inference Providers permission from "
                "https://huggingface.co/settings/tokens"
            )
        return OpenAI(api_key=api_key, base_url=API_BASE_URL)

    def owns_model(self, model_id: str) -> bool:
        """Accept any remaining id after more specific providers have been tried."""
        return bool((model_id or "").strip())

    def listed_models(self) -> list[dict]:
        """Return the cached provider model list, refreshing it when stale."""
        now = time.monotonic()
        if self._cached_models is None or now - self._cached_models[0] >= CACHE_TTL_SECONDS:
            self._cached_models = (now, self._fetch_provider_models())
        return self._cached_models[1]

    def list_parameters(self, model_id: str) -> list[dict]:
        """Return inference knobs with Hub defaults, plus reasoning when supported."""
        now = time.monotonic()
        cached = self._cached_parameters.get(model_id)
        if cached is not None and now - cached[0] < CACHE_TTL_SECONDS:
            return cached[1]

        hub_repo = repo_id(model_id)
        context_length = self.get_context_length(model_id)
        config = repo_json(hub_repo, "generation_config.json") or {}
        parameters = huggingface_chat_parameters(context_length)
        apply_hub_defaults(parameters, config)

        if supports_reasoning(model_id, repo_tags(hub_repo)):
            parameters.append(reasoning_parameter())

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
        """Send chat messages to the Hugging Face router."""
        from model.parameter import sanitize_settings

        model_id, cleaned = sanitize_settings(model, settings)
        if max_tokens is not None:
            cleaned["max_tokens"] = max_tokens

        mapped = {REQUEST_KEY_ALIASES.get(key, key): value for key, value in cleaned.items()}
        if mapped.get("reasoning_effort") in {None, "none"}:
            mapped.pop("reasoning_effort", None)
        create_kwargs = {key: mapped[key] for key in OPENAI_CREATE_KEYS if key in mapped}
        extra_body = {key: value for key, value in mapped.items() if key not in OPENAI_CREATE_KEYS}
        if extra_body:
            create_kwargs["extra_body"] = extra_body

        output = self.create_client().chat.completions.create(
            model=model_id,
            messages=messages,
            **create_kwargs,
        )
        message = output.choices[0].message
        content = (message.content or "").strip()
        if content:
            return content
        reasoning = getattr(message, "reasoning", None) or getattr(message, "reasoning_content", None)
        return (reasoning or "").strip()

    def _get_company_id(self, item, model_id: str) -> str:
        """Return the model publisher (owned_by, or the Hub org in the id)."""
        owned = getattr(item, "owned_by", None)
        if owned:
            return str(owned)
        repo = repo_id(model_id)
        if "/" in repo:
            return repo.split("/", 1)[0]
        return repo

    def _get_model_label(self, model_id: str) -> str:
        """Return the model name without org or provider suffix."""
        return repo_id(model_id).rsplit("/", 1)[-1]

    def _get_provider_context_length(self, item) -> int | None:
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

    def _fetch_provider_models(self) -> list[dict]:
        """Ask the inference provider for every model it currently exposes."""
        models = []
        seen = set()
        for item in self.create_client().models.list():
            model_id = getattr(item, "id", None)
            if not model_id or model_id in seen:
                continue
            seen.add(model_id)
            models.append({
                "id": model_id,
                "label": self._get_model_label(model_id),
                "provider": self.id,
                "company": self._get_company_id(item, model_id),
                "context_length": self._get_provider_context_length(item),
            })
        models.sort(key=lambda model: model["id"].lower())
        return models
