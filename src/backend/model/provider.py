"""Shared contract for every model provider."""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from pathlib import Path

from dotenv import load_dotenv


class Provider(ABC):
    """One source of models: catalog, parameters, and completions."""

    id: str
    label: str

    def __init__(self) -> None:
        self._fix_invalid_ssl_env()

    def _project_root(self) -> Path:
        """Return the repo root that contains infra/env."""
        for parent in Path(__file__).resolve().parents:
            if (parent / "infra" / "env").is_file():
                return parent
        return Path(__file__).resolve().parents[3]

    def _fix_invalid_ssl_env(self) -> None:
        """Load infra/env and drop conda/Git Bash SSL vars that point to a missing file."""
        load_dotenv(self._project_root() / "infra" / "env")
        for key in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
            value = os.environ.get(key)
            if value and not Path(value).is_file():
                os.environ.pop(key, None)

        fallback = Path(os.environ.get("CONDA_PREFIX", "")) / "Library" / "ssl" / "cacert.pem"
        if fallback.is_file() and not os.environ.get("SSL_CERT_FILE"):
            os.environ["SSL_CERT_FILE"] = str(fallback)

    @abstractmethod
    def create_client(self):
        """Return this provider's API client."""

    @abstractmethod
    def listed_models(self) -> list[dict]:
        """Return the models this provider can serve."""

    def owns_model(self, model_id: str) -> bool:
        """Return True when this provider claims the selected model id."""
        chosen = (model_id or "").strip()
        return any(model["id"] == chosen for model in self.listed_models())

    def get_context_length(self, model_id: str) -> int | None:
        """Return the advertised context window for one of this provider's models."""
        for model in self.listed_models():
            if model["id"] == model_id:
                return model.get("context_length")
        return None

    def get_panel_entry(self) -> dict | None:
        """Return the sidebar catalog, or None when this provider has no models."""
        try:
            models = self.listed_models()
        except Exception:
            models = []
        if not models:
            return None

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
            company["models"].sort(key=lambda entry: entry["label"].lower())

        return {
            "id": self.id,
            "label": self.label,
            "companies": sorted(companies.values(), key=lambda company: company["id"].lower()),
        }

    @abstractmethod
    def list_parameters(self, model_id: str) -> list[dict]:
        """Return generation fields for this model. Empty means the UI shows none."""

    @abstractmethod
    def complete_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        settings: dict | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Return the assistant reply for this provider."""
