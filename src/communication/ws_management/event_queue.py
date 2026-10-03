from asyncio import Queue

# Events waiting to be broadcast to WebSocket clients.
event_queue = Queue()
