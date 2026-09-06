import os
import pandas as pd


ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"]


def read_data_file(file_path: str):

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    extension = os.path.splitext(file_path)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    if extension == ".csv":
        df = pd.read_csv(file_path)

    else:
        df = pd.read_excel(file_path)

    return df