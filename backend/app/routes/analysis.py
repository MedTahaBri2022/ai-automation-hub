import json
import math
from datetime import datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.history import AnalysisHistory


router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["Analysis"],
)


# =========================================================
# HELPERS
# =========================================================

def clean_for_json(value: Any):
    """
    Convert pandas / numpy values into JSON-safe Python values.

    Important:
    JSON does not allow NaN or Infinity.
    They are converted to None.
    """

    if value is None:
        return None

    # pandas NaN / NaT
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    # Dictionary
    if isinstance(value, dict):
        return {
            str(k): clean_for_json(v)
            for k, v in value.items()
        }

    # List / tuple
    if isinstance(value, (list, tuple)):
        return [
            clean_for_json(v)
            for v in value
        ]

    # pandas Timestamp
    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    # datetime
    if isinstance(value, datetime):
        return value.isoformat()

    # Float
    if isinstance(value, float):
        if not math.isfinite(value):
            return None

        return value

    # Integer / numpy numeric values
    try:
        if hasattr(value, "item"):
            return value.item()
    except Exception:
        pass

    return value


def dataframe_preview(df: pd.DataFrame, limit: int = 100):
    """
    Return a JSON-safe preview of the dataset.
    """

    preview_df = df.head(limit).copy()

    records = preview_df.to_dict(
        orient="records"
    )

    return clean_for_json(records)


# =========================================================
# ANALYSIS
# =========================================================

@router.post("/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Analyze CSV / XLSX / XLS files.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    filename = file.filename.lower()

    if not filename.endswith(
        (".csv", ".xlsx", ".xls")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only CSV, XLSX and XLS files are supported.",
        )

    try:

        # =====================================================
        # READ FILE
        # =====================================================

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        from io import BytesIO

        buffer = BytesIO(contents)

        if filename.endswith(".csv"):

            # First try standard CSV
            try:
                df = pd.read_csv(
                    buffer,
                    low_memory=False,
                )

            except Exception:

                buffer.seek(0)

                # Fallback for unusual CSV separators
                df = pd.read_csv(
                    buffer,
                    sep=None,
                    engine="python",
                )

        elif filename.endswith(".xlsx"):

            df = pd.read_excel(
                buffer,
                engine="openpyxl",
            )

        else:

            df = pd.read_excel(
                buffer,
            )

        # =====================================================
        # BASIC INFORMATION
        # =====================================================

        rows = int(df.shape[0])
        columns = int(df.shape[1])

        column_names = [
            str(column)
            for column in df.columns
        ]

        # =====================================================
        # DATA TYPES
        # =====================================================

        data_types = {
            str(column): str(dtype)
            for column, dtype
            in df.dtypes.items()
        }

        # =====================================================
        # MISSING VALUES
        # =====================================================

        missing_values = {
            str(column): int(value)
            for column, value
            in df.isnull()
            .sum()
            .items()
        }

        missing_percentage = {
            str(column): round(
                float(
                    value / rows * 100
                ),
                2,
            )
            if rows > 0
            else 0
            for column, value
            in df.isnull()
            .sum()
            .items()
        }

        # =====================================================
        # NUMERIC COLUMNS
        # =====================================================

        numeric_df = df.select_dtypes(
            include="number"
        )

        numeric_statistics = {}

        for column in numeric_df.columns:

            series = numeric_df[column]

            numeric_statistics[str(column)] = {
                "count": clean_for_json(
                    series.count()
                ),
                "mean": clean_for_json(
                    series.mean()
                ),
                "min": clean_for_json(
                    series.min()
                ),
                "max": clean_for_json(
                    series.max()
                ),
                "median": clean_for_json(
                    series.median()
                ),
                "std": clean_for_json(
                    series.std()
                ),
                "sum": clean_for_json(
                    series.sum()
                ),
            }

        # =====================================================
        # KPI STATISTICS
        # =====================================================

        kpis = {}

        for column in numeric_df.columns:

            series = numeric_df[column]

            kpis[str(column)] = {
                "total": clean_for_json(
                    series.sum()
                ),
                "average": clean_for_json(
                    series.mean()
                ),
                "minimum": clean_for_json(
                    series.min()
                ),
                "maximum": clean_for_json(
                    series.max()
                ),
                "median": clean_for_json(
                    series.median()
                ),
            }

        # =====================================================
        # CORRELATIONS
        # =====================================================

        correlations = {}

        if len(numeric_df.columns) >= 2:

            correlation_df = (
                numeric_df
                .corr(numeric_only=True)
                .round(4)
            )

            correlations = clean_for_json(
                correlation_df.to_dict()
            )

        # =====================================================
        # CATEGORICAL STATISTICS
        # =====================================================

        categorical_statistics = {}

        categorical_df = df.select_dtypes(
            exclude="number"
        )

        for column in categorical_df.columns:

            series = categorical_df[column]

            value_counts = (
                series
                .dropna()
                .astype(str)
                .value_counts()
                .head(10)
                .to_dict()
            )

            categorical_statistics[
                str(column)
            ] = {
                "unique_values": int(
                    series.nunique(
                        dropna=True
                    )
                ),
                "top_values": clean_for_json(
                    value_counts
                ),
            }

        # =====================================================
        # PREVIEW
        # =====================================================

        preview = dataframe_preview(
            df,
            limit=100,
        )

        # =====================================================
        # DATA ANALYSIS
        # =====================================================

        data_analysis = {
            "action": "analyze",
            "status": "success",
            "filename": file.filename,
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
            "preview": preview,
        }

        # =====================================================
        # AI ANALYSIS
        # =====================================================

        # AI can be connected later.
        # Keeping a stable structure for the frontend.

        ai_analysis = {
            "success": False,
            "model": None,
            "analysis": None,
        }

        # =====================================================
        # SAFE RESULT
        # =====================================================

        result = {
            "success": True,
            "file": {
                "filename": file.filename,
                "size": len(contents),
            },
            "data_analysis": data_analysis,
            "ai_analysis": ai_analysis,
        }

        # Ensure EVERYTHING is JSON-safe
        result = clean_for_json(result)

        # =====================================================
        # SAVE HISTORY
        # =====================================================

        analysis_history = AnalysisHistory(
            filename=file.filename,
            rows=rows,
            columns=columns,
            summary="Dataset analyzed successfully.",
            analysis_json=json.dumps(
                result,
                ensure_ascii=False,
            ),
            created_at=datetime.utcnow(),
        )

        db.add(analysis_history)

        db.commit()

        db.refresh(analysis_history)

        # =====================================================
        # RESPONSE
        # =====================================================

        result["history_id"] = (
            analysis_history.id
        )

        return result

    except HTTPException:
        raise

    except Exception as exc:

        db.rollback()

        print(
            "ANALYSIS ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(exc)}",
        )