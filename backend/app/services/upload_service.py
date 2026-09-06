import os
import uuid
from pathlib import Path

UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ALLOWED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls"
}


def save_uploaded_file(
    filename: str,
    content: bytes
):

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            "Only CSV and Excel files are supported."
        )

    unique_name = (
        f"{uuid.uuid4()}{extension}"
    )

    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as file:
        file.write(content)

    return str(file_path)