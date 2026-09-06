from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.automation import Automation
from app.services.workflow_engine import WorkflowEngine


router = APIRouter(
    prefix="/api/v1/automations",
    tags=["Automations"]
)


class AutomationCreate(BaseModel):
    name: str
    description: str


@router.post("/")
def create_automation(
    automation: AutomationCreate,
    db: Session = Depends(get_db)
):
    new_automation = Automation(
        name=automation.name,
        description=automation.description,
        status="created"
    )

    db.add(new_automation)
    db.commit()
    db.refresh(new_automation)

    return {
        "id": new_automation.id,
        "name": new_automation.name,
        "description": new_automation.description,
        "status": new_automation.status
    }


@router.post("/{automation_id}/execute")
def execute_automation(
    automation_id: int,
    db: Session = Depends(get_db)
):
    automation = db.query(Automation).filter(
        Automation.id == automation_id
    ).first()

    if not automation:
        return {
            "success": False,
            "error": "Automation not found"
        }

    engine = WorkflowEngine()

    # First workflow step
    def process_automation(context):
        return {
            "automation_id": automation.id,
            "name": automation.name,
            "description": automation.description,
            "message": "Automation executed successfully"
        }

    engine.add_step(
        "process_automation",
        process_automation
    )

    result = engine.execute({
        "automation_id": automation.id
    })

    automation.status = "completed"
    db.commit()

    return {
        "success": True,
        "automation_id": automation.id,
        "result": result
    }