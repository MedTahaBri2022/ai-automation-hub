from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.workflow_engine import WorkflowEngine


router = APIRouter(
    prefix="/api/v1/workflows",
    tags=["Workflows"]
)


class WorkflowStep(BaseModel):
    name: str
    action: str


class WorkflowRequest(BaseModel):
    steps: List[WorkflowStep]
    input: Dict[str, Any]


@router.get("/health")
def workflow_health():
    return {
        "status": "Workflow service ready"
    }


@router.post("/execute")
def execute_workflow(request: WorkflowRequest):

    engine = WorkflowEngine()

    for step in request.steps:
        engine.add_step(
            name=step.name,
            action=step.action
        )

    result = engine.execute(
        request.input
    )

    return result