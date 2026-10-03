from dataclasses import dataclass, field

from utils.dataclass.event import Event


@dataclass(slots=True)
class History:
    events: list[Event] = field(default_factory=list)

    @classmethod
    def create(cls) -> "History":
        """Create an empty execution history."""
        return cls()

    def add_event(self, event: Event) -> None:
        """Append a new event to the history timeline."""
        self.events.append(event)
