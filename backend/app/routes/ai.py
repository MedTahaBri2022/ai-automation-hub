from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import tempfile
import os

from app.services.action_registry import registry


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI"]
)


@router.get("/health")
def ai_health():
    return {
        "status": "AI service ready"
    }


@router.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...)
):
    """
    Upload CSV/XLSX and analyze it with AI.
    """

    allowed_extensions = {
        ".csv",
        ".xlsx",
        ".xls"
    }

    extension = Path(file.filename).suffix.lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Only CSV, XLSX and XLS files are supported."
        )

    temp_path = None

    try:

        # Read uploaded file
        content = await file.read()

        # Create temporary file
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            temp_file.write(content)
            temp_path = temp_file.name

        # Process file
        file_result = registry.execute(
            "process_file",
            {
                "data": {
                    "file_path": temp_path
                }
            }
        )

        # Analyze processed data
        ai_result = registry.execute(
            "ai_analyze",
            {
                "data": file_result
            }
        )

        return {
            "success": True,
            "filename": file.filename,
            "file_analysis": file_result,
            "ai_analysis": ai_result
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)