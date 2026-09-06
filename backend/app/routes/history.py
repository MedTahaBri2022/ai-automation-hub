from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.history import AnalysisHistory


router = APIRouter(
    prefix="/history",
    tags=["History"],
)


# =========================================================
# GET ALL HISTORY
# =========================================================

@router.get("")
def get_history(
    db: Session = Depends(get_db)
):
    history = (
        db.query(AnalysisHistory)
        .order_by(
            AnalysisHistory.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": item.id,
            "filename": item.filename,
            "rows": item.rows,
            "columns": item.columns,
            "summary": item.summary,
            "analysis": item.analysis_json,
            "created_at": item.created_at,
        }
        for item in history
    ]


# =========================================================
# GET ONE HISTORY ITEM
# =========================================================

@router.get("/{history_id}")
def get_history_item(
    history_id: int,
    db: Session = Depends(get_db)
):
    item = (
        db.query(AnalysisHistory)
        .filter(
            AnalysisHistory.id == history_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Analysis history not found"
        )

    return {
        "id": item.id,
        "filename": item.filename,
        "rows": item.rows,
        "columns": item.columns,
        "summary": item.summary,
        "analysis": item.analysis_json,
        "created_at": item.created_at,
    }


# =========================================================
# DELETE ONE HISTORY ITEM
# =========================================================

@router.delete("/{history_id}")
def delete_history(
    history_id: int,
    db: Session = Depends(get_db)
):
    item = (
        db.query(AnalysisHistory)
        .filter(
            AnalysisHistory.id == history_id
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Analysis history not found"
        )

    db.delete(item)
    db.commit()

    return {
        "success": True,
        "message": "Analysis history deleted successfully",
        "id": history_id,
    }