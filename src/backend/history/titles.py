"""Short conversation titles via a small extra LLM call."""

from model.llm_client import complete_chat

SNIPPET_LENGTH = 300

TITLE_SYSTEM = (
    "Summarize this chat in a short title of 3 to 8 words. "
    "Reply with the title only. No quotes, no trailing punctuation."
)


def _clip(text: str) -> str:
    """Truncate a message snippet so the title prompt stays small."""
    text = " ".join(text.split())
    if len(text) <= SNIPPET_LENGTH:
        return text
    return text[:SNIPPET_LENGTH].rstrip() + "…"


def _clean_title(raw: str) -> str:
    """Keep a short title line from a possibly verbose model reply."""
    lines = [line.strip(" \"'`") for line in raw.splitlines() if line.strip()]
    if not lines:
        return ""
    for line in reversed(lines):
        words = line.split()
        lowered = line.lower()
        if lowered.startswith(("user:", "assistant:", "summarize", "title:")):
            continue
        if 2 <= len(words) <= 12:
            return line.removeprefix("Title:").strip()
    return lines[-1]


def generate_title(messages: list[dict[str, str]]) -> str:
    """Ask the model for a short title from the first one or two exchanges."""
    snippets: list[str] = []
    user_count = 0
    assistant_count = 0
    for message in messages:
        role = message.get("role")
        content = message.get("content", "").strip()
        if not content:
            continue
        if role == "user" and user_count < 2:
            snippets.append(f"User: {_clip(content)}")
            user_count += 1
        elif role == "assistant" and assistant_count < 2:
            snippets.append(f"Assistant: {_clip(content)}")
            assistant_count += 1
    if user_count == 0:
        return ""

    raw = complete_chat(
        [
            {"role": "system", "content": TITLE_SYSTEM},
            {"role": "user", "content": "\n".join(snippets)},
        ],
        max_tokens=256,
    )
    return _clean_title(raw)
