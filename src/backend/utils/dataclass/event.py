from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class Event:
    timestamp: str
    state: str
    content: str

    @classmethod
    def create(cls, state: str, content: str) -> "Event":
        """Build a new event with the current local timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return cls(timestamp=timestamp, state=state, content=content)

    def to_payload(self) -> dict[str, Any]:
        """Serialize the event to a JSON-compatible dictionary."""
        return {
            "timestamp": self.timestamp,
            "state": self.state,
            "content": self.content,
        }
