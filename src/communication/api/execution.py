"""Stop the in-flight chat job from the UI."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from communication.ws_management.ws_manager import stop_execution

router = APIRouter()


class ExecutionStopRequest(BaseModel):
    """Identifies the chat request the user wants to abort."""

    key: str = Field(..., min_length=1)


@router.post("/api/execution/stop")
async def stop_current_execution(payload: ExecutionStopRequest) -> dict[str, bool]:
    """Signal create_chat to return as soon as this job is running."""
    stop_execution(payload.key)
    return {"ok": True}
