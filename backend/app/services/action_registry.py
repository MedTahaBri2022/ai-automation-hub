from pathlib import Path
from typing import Any, Callable, Dict

import pandas as pd

from app.services.ai_service import ai_service


class ActionRegistry:

    def __init__(self):
        self.actions: Dict[str, Callable] = {}

    def register(self, name: str, function: Callable):
        self.actions[name] = function

    def execute(
        self,
        name: str,
        context: Dict[str, Any]
    ) -> Any:

        if name not in self.actions:
            raise ValueError(
                f"Action '{name}' is not registered"
            )

        return self.actions[name](context)


# =========================================================
# FILE PROCESSING
# =========================================================

def process_file_action(context):

    data = context.get("data", context)

    file_path = data.get("file_path")

    if not file_path:
        raise ValueError(
            "process_file requires 'file_path'"
        )

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    extension = path.suffix.lower()

    if extension == ".csv":
        df = pd.read_csv(path)

    elif extension in [".xlsx", ".xls"]:
        df = pd.read_excel(path)

    else:
        raise ValueError(
            "Supported files: CSV, XLSX, XLS"
        )

    rows = len(df)
    columns = len(df.columns)

    column_names = df.columns.tolist()

    # =====================================================
    # DATA TYPES
    # =====================================================

    data_types = {
        column: str(dtype)
        for column, dtype in df.dtypes.items()
    }

    # =====================================================
    # MISSING VALUES
    # =====================================================

    missing_values = (
        df.isnull()
        .sum()
        .to_dict()
    )

    if rows > 0:
        missing_percentage = (
            (
                df.isnull().sum()
                / rows
                * 100
            )
            .round(2)
            .to_dict()
        )
    else:
        missing_percentage = {}

    # =====================================================
    # NUMERIC STATISTICS
    # =====================================================

    numeric_statistics = {}

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns

    for column in numeric_columns:

        series = df[column]

        numeric_statistics[column] = {
            "count": int(series.count()),
            "mean": float(series.mean()),
            "min": float(series.min()),
            "max": float(series.max()),
            "median": float(series.median()),
            "std": (
                float(series.std())
                if series.count() > 1
                else 0.0
            ),
            "sum": float(series.sum())
        }

    # =====================================================
    # KPIs
    # =====================================================

    kpis = {}

    for column in numeric_columns:

        series = df[column]

        kpis[column] = {
            "total": float(series.sum()),
            "average": float(series.mean()),
            "minimum": float(series.min()),
            "maximum": float(series.max()),
            "median": float(series.median())
        }

    # =====================================================
    # CORRELATIONS
    # =====================================================

    correlations = {}

    if len(numeric_columns) >= 2:

        correlation_matrix = (
            df[numeric_columns]
            .corr()
            .round(3)
        )

        correlations = (
            correlation_matrix
            .to_dict()
        )

    # =====================================================
    # CATEGORICAL STATISTICS
    # =====================================================

    categorical_statistics = {}

    categorical_columns = df.select_dtypes(
        include=["object", "category"]
    ).columns

    for column in categorical_columns:

        value_counts = (
            df[column]
            .value_counts()
            .head(5)
            .to_dict()
        )

        categorical_statistics[column] = {
            "unique_values": int(
                df[column].nunique()
            ),
            "top_values": {
                str(key): int(value)
                for key, value in value_counts.items()
            }
        }

    # =====================================================
    # PREVIEW
    # =====================================================

    preview_df = df.head(5).copy()

    preview_df = preview_df.where(
        pd.notnull(preview_df),
        None
    )

    preview = preview_df.to_dict(
        orient="records"
    )

    # =====================================================
    # RESULT
    # =====================================================

    return {
        "action": "process_file",
        "status": "success",
        "filename": path.name,
        "rows": rows,
        "columns": columns,
        "column_names": column_names,
        "data_types": data_types,
        "missing_values": missing_values,
        "missing_percentage": missing_percentage,
        "numeric_statistics": numeric_statistics,
        "kpis": kpis,
        "correlations": correlations,
        "categorical_statistics": categorical_statistics,
        "preview": preview
    }


# =========================================================
# AI ANALYSIS
# =========================================================

def ai_analyze_action(context):

    data = context.get("data", context)

    result = ai_service.analyze(data)

    return result


# =========================================================
# REGISTRY
# =========================================================

registry = ActionRegistry()

registry.register(
    "process_file",
    process_file_action
)

registry.register(
    "ai_analyze",
    ai_analyze_action
)