from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException


router = APIRouter(
    prefix="/api/v1/files",
    tags=["Files"]
)


# uploads/ au niveau du backend
BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


ALLOWED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls"
}


@router.get("/health")
def files_health():

    return {
        "status": "Files service ready"
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed: CSV, XLSX, XLS"
            )
        )

    # Generate unique filename
    unique_name = (
        f"{uuid4().hex}{extension}"
    )

    file_path = UPLOAD_DIR / unique_name

    try:

        content = await file.read()

        with open(
            file_path,
            "wb"
        ) as buffer:

            buffer.write(content)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not save file: {error}"
        )

    return {
        "success": True,
        "filename": file.filename,
        "stored_filename": unique_name,
        "content_type": file.content_type,
        "size": len(content),
        "file_path": str(file_path)
    }