"""Paid OpenAI provider identifiers and chat request mapping."""

PROVIDER_ID = "openai"
PROVIDER_LABEL = "OpenAI"
COMPANY_ID = "OpenAI"
DEFAULT_MODEL_ID = "gpt-4o-mini"
API_BASE_URL = "https://api.openai.com/v1"

CACHE_TTL_SECONDS = 300
PRICING_CACHE_TTL_SECONDS = 3600
PRICING_URL = "https://developers.openai.com/api/docs/pricing.md"
DEFAULT_CONTEXT_LENGTH = 128000

CREATE_KEYS = {
    "max_tokens",
    "max_completion_tokens",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "reasoning_effort",
}

REASONING_PREFIXES = ("o1", "o3", "o4", "gpt-5")
