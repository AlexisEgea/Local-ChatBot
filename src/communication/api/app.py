"""FastAPI app: HTTP routers and static frontend."""

from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from communication.api.chat import router as chat_router
from communication.api.history import router as history_router
from communication.api.websocket import lifespan, router as websocket_router

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(title="Local ChatBot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(history_router)
app.include_router(websocket_router)


@app.get("/")
async def serve_index() -> FileResponse:
    """Serve the chat UI."""
    return FileResponse(FRONTEND_DIR / "index.html")


# Static assets only — do not mount at "/" or GET /api/history/{id} is swallowed.
app.mount("/style", StaticFiles(directory=str(FRONTEND_DIR / "style")), name="style")
app.mount("/script", StaticFiles(directory=str(FRONTEND_DIR / "script")), name="script")
