from utils.dataclass.event import Event
from utils.dataclass.history import History
from communication.ws_management.event_queue import event_queue

def log_event(history: History, state: str, content: str, debug: bool = True) -> Event:
    """Create an event, persist it in history, and enqueue it for WebSocket broadcast."""
    event = Event.create(state, content)
    history.add_event(event)

    try:
        event_queue.put_nowait(event.to_payload())
    except Exception as error:
        print(f"[QUEUE ERROR] {error}")

    if debug:
        print(f"{event.timestamp}: {event.state}: {event.content}")
    else:
        print(event.content)

    return event

