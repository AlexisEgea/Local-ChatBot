"""Start the FastAPI communication server with a bindable local port."""

import os
import socket
import sys
from pathlib import Path

import uvicorn

# Allow `import communication...` when this file is launched directly.
SRC_DIR = Path(__file__).resolve().parents[1]
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def _find_free_port(host: str) -> int:
    """Find and return an available TCP port on the given host."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def _can_bind(host: str, port: int) -> bool:
    """Return True when the host/port pair is not reserved or already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def run_server() -> None:
    """Resolve host/port settings and start the FastAPI server."""
    host = os.getenv("COMMUNICATION_HOST", "127.0.0.1")
    raw_port = os.getenv("COMMUNICATION_PORT")
    port = int(raw_port) if raw_port else _find_free_port(host)
    # Windows may exclude common ports such as 8000 (WinError 10013).
    if not _can_bind(host, port):
        fallback = _find_free_port(host)
        print(f"Port {port} is unavailable, using {fallback} instead")
        port = fallback

    print(f"Communication server starting on http://{host}:{port}")

    from communication.api.app import app

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
