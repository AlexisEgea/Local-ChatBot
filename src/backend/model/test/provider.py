"""Fixed test provider: no parameters, always the same reply."""

from model.provider import Provider
from model.test.constant import COMPANY_ID, MODEL_ID, PROVIDER_ID, REPLY


class TestProvider(Provider):
    """Local fixture model that never calls a remote API."""

    id = PROVIDER_ID
    label = PROVIDER_ID

    def create_client(self):
        """The test provider has no remote API client."""
        return None

    def listed_models(self) -> list[dict]:
        """Return the test model list."""
        return [
            {
                "id": MODEL_ID,
                "label": MODEL_ID,
                "provider": self.id,
                "company": COMPANY_ID,
                "context_length": None,
            }
        ]

    def list_parameters(self, model_id: str) -> list[dict]:
        """The test model has no generation fields."""
        return []

    def complete_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        settings: dict | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Return the fixed test reply."""
        return REPLY
