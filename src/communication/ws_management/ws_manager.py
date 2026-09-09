from fastapi import WebSocket
import asyncio

connections: set[WebSocket] = set()


async def connect(ws: WebSocket):
    """Accept and register a new WebSocket client."""
    await ws.accept()
    connections.add(ws)
    print(f"[WS] Client connected. Total = {len(connections)}")


def disconnect(ws: WebSocket):
    """Unregister a WebSocket client."""
    connections.discard(ws)
    print(f"[WS] Client disconnected. Total = {len(connections)}")


async def broadcast(event: dict):
    """Send one event to every connected client and prune dead sockets."""
    # print(f"[WS] Broadcasting to {len(connections)} clients")

    for ws in list(connections):
        try:
            await ws.send_json(event)
        except Exception as e:
            print(f"[WS] send failed: {e}")
            connections.discard(ws)
