"""Paid OpenAI chat knobs, including reasoning models."""

from __future__ import annotations

from model.openai.constant import DEFAULT_CONTEXT_LENGTH
from model.openai.reasoning import supports_reasoning


def openai_chat_parameters(model_id: str, context_length: int | None) -> list[dict]:
    """Return chat knobs; reasoning models only expose tokens and effort."""
    high = context_length or DEFAULT_CONTEXT_LENGTH
    parameters = [
        {
            "id": "max_tokens",
            "label": "Max tokens",
            "type": "integer",
            "min": 1,
            "max": high,
            "step": 1,
            "default": min(256, high),
        },
    ]
    if supports_reasoning(model_id):
        parameters.append(
            {
                "id": "reasoning_effort",
                "label": "Reasoning effort",
                "type": "select",
                "default": "low",
                "options": [
                    {"id": "low", "label": "Low"},
                    {"id": "medium", "label": "Medium"},
                    {"id": "high", "label": "High"},
                ],
            }
        )
        return parameters

    parameters.extend(
        [
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
    )
    return parameters
