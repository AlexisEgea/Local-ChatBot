"""Generation parameters common to every model on the inference router."""

from __future__ import annotations

_REASONING_HINTS = (
    "gpt-oss",
    "reasoning",
    "thinking",
    "reasoner",
    "deepseek-r1",
    "qwq",
)


def huggingface_chat_parameters(context_length: int | None) -> list[dict]:
    """Return the Hugging Face OpenAI-compatible chat knobs for this context window."""
    high = context_length or 4096
    return [
        {
            "id": "max_tokens",
            "label": "Max tokens",
            "type": "integer",
            "min": 1,
            "max": high,
            "step": 1,
            "default": min(256, high),
        },
        {
            "id": "temperature",
            "label": "Temperature",
            "type": "number",
            "min": 0,
            "max": 2,
            "step": 0.05,
            "default": 1,
        },
        {
            "id": "top_p",
            "label": "Top p",
            "type": "number",
            "min": 0,
            "max": 1,
            "step": 0.05,
            "default": 1,
        },
        {
            "id": "frequency_penalty",
            "label": "Frequency penalty",
            "type": "number",
            "min": -2,
            "max": 2,
            "step": 0.1,
            "default": 0,
        },
        {
            "id": "presence_penalty",
            "label": "Presence penalty",
            "type": "number",
            "min": -2,
            "max": 2,
            "step": 0.1,
            "default": 0,
        },
    ]


def reasoning_parameter() -> dict:
    """Return the chat-API reasoning control for models that support it."""
    return {
        "id": "reasoning_effort",
        "label": "Reasoning effort",
        "type": "select",
        "default": "low",
        "options": [
            {"id": "none", "label": "None"},
            {"id": "low", "label": "Low"},
            {"id": "medium", "label": "Medium"},
            {"id": "high", "label": "High"},
        ],
    }


def supports_reasoning(model_id: str, tags: list[str]) -> bool:
    """Return True when the model id or Hub tags look like a reasoning model."""
    blob = f"{model_id} {' '.join(tags)}".lower()
    return any(hint in blob for hint in _REASONING_HINTS)
