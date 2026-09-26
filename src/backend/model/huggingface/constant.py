"""Hugging Face provider identifiers and chat request mapping."""

PROVIDER_ID = "huggingface"
PROVIDER_LABEL = "Hugging Face"
TITLE_MODEL_ID = "openai/gpt-oss-20b"
API_BASE_URL = "https://router.huggingface.co/v1"

CACHE_TTL_SECONDS = 300

OPENAI_CREATE_KEYS = {
    "max_tokens",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "seed",
}
REQUEST_KEY_ALIASES = {
    "max_new_tokens": "max_tokens",
    "max_length": "max_tokens",
}
