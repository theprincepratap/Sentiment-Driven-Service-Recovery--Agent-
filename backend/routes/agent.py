from fastapi import APIRouter
from agent.agent import run_agent

router = APIRouter()


@router.post("/agent/run")
async def run_service_recovery_agent():
    """
    Trigger the full Service Recovery Agent workflow.
    Returns the complete execution trace with all tool calls and results.
    """
    result = await run_agent(use_gemini=True)
    return result


@router.get("/agent/run")
async def run_service_recovery_agent_get():
    """GET version for easy browser/Swagger testing."""
    result = await run_agent(use_gemini=True)
    return result
