import json
import os
from typing import Any, Dict

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


class AIService:

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not configured"
            )

        self.client = Groq(
            api_key=api_key
        )

        self.model = "openai/gpt-oss-120b"

    # =========================================================
    # CLEAN DATA FOR AI
    # =========================================================

    def _build_ai_profile(
        self,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:

        profile = {
            "filename": data.get("filename"),
            "rows": data.get("rows"),
            "columns": data.get("columns"),
            "column_names": data.get(
                "column_names",
                []
            ),
            "data_types": data.get(
                "data_types",
                {}
            ),
            "missing_values": data.get(
                "missing_values",
                {}
            ),
            "missing_percentage": data.get(
                "missing_percentage",
                {}
            ),
            "numeric_statistics": data.get(
                "numeric_statistics",
                {}
            ),
            "kpis": data.get(
                "kpis",
                {}
            ),
            "correlations": data.get(
                "correlations",
                {}
            ),
            "categorical_statistics": data.get(
                "categorical_statistics",
                {}
            ),
        }

        return profile

    # =========================================================
    # NORMALIZE AI RESULT
    # =========================================================

    def _normalize_result(
        self,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:

        if not isinstance(result, dict):
            result = {}

        summary = result.get(
            "summary",
            "No summary available."
        )

        kpis = result.get(
            "kpis",
            []
        )

        insights = result.get(
            "insights",
            []
        )

        anomalies = result.get(
            "anomalies",
            []
        )

        recommendations = result.get(
            "recommendations",
            []
        )

        if not isinstance(kpis, list):
            kpis = []

        if not isinstance(insights, list):
            insights = []

        if not isinstance(anomalies, list):
            anomalies = []

        if not isinstance(recommendations, list):
            recommendations = []

        normalized_kpis = []

        for kpi in kpis:

            if isinstance(kpi, dict):

                normalized_kpis.append(
                    {
                        "name": str(
                            kpi.get(
                                "name",
                                "KPI"
                            )
                        ),
                        "value": str(
                            kpi.get(
                                "value",
                                ""
                            )
                        ),
                        "description": str(
                            kpi.get(
                                "description",
                                ""
                            )
                        )
                    }
                )

        return {
            "summary": str(summary),
            "kpis": normalized_kpis,
            "insights": [
                str(item)
                for item in insights
            ],
            "anomalies": [
                str(item)
                for item in anomalies
            ],
            "recommendations": [
                str(item)
                for item in recommendations
            ]
        }

    # =========================================================
    # ANALYZE
    # =========================================================

    def analyze(
        self,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:

        profile = self._build_ai_profile(data)

        prompt = f"""
You are a senior business data analyst.

Analyze this business dataset profile.

DATASET PROFILE:
{json.dumps(
    profile,
    indent=2,
    ensure_ascii=False,
    default=str
)}

Your task is to produce useful business intelligence.

Identify:

1. A concise business summary.
2. Important KPIs.
3. Important business insights.
4. Potential anomalies or data-quality issues.
5. Actionable business recommendations.

IMPORTANT:

- Use the actual numbers from the dataset.
- Do not invent numbers.
- If a value is unavailable, say so.
- Focus on business meaning.
- Mention important trends between categories, regions,
  products, sales, profit, quantity or discount when available.
- Keep the analysis concise and useful.
- Do NOT analyze individual rows.
- Do NOT return Markdown.
- Return ONLY valid JSON.

Use EXACTLY this structure:

{{
    "summary": "Business summary",

    "kpis": [
        {{
            "name": "KPI name",
            "value": "KPI value",
            "description": "Why this KPI matters"
        }}
    ],

    "insights": [
        "Business insight 1",
        "Business insight 2",
        "Business insight 3"
    ],

    "anomalies": [
        "Potential anomaly or data quality issue"
    ],

    "recommendations": [
        "Actionable recommendation 1",
        "Actionable recommendation 2",
        "Actionable recommendation 3"
    ]
}}

Return ONLY the JSON object.
"""

        try:

            response = (
                self.client
                .chat
                .completions
                .create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an expert "
                                "business data analyst. "
                                "Always return valid JSON."
                            )
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.2,
                    max_tokens=3000,
                )
            )

            content = (
                response
                .choices[0]
                .message
                .content
            )

            if not content:
                raise ValueError(
                    "AI returned an empty response"
                )

            content = content.strip()

            # Remove Markdown code fences if the model
            # accidentally adds them.

            if content.startswith(
                "```json"
            ):
                content = content[
                    len("```json"):
                ]

            elif content.startswith(
                "```"
            ):
                content = content[
                    len("```"):
                ]

            if content.endswith(
                "```"
            ):
                content = content[
                    :-len("```")
                ]

            content = content.strip()

            result = json.loads(
                content
            )

            normalized = (
                self._normalize_result(
                    result
                )
            )

            return {
                "success": True,
                "model": self.model,
                "analysis": normalized
            }

        except json.JSONDecodeError as error:

            return {
                "success": False,
                "model": self.model,
                "analysis": None,
                "error": (
                    "AI returned invalid JSON"
                ),
                "details": str(error)
            }

        except Exception as error:

            return {
                "success": False,
                "model": self.model,
                "analysis": None,
                "error": str(error)
            }


# =========================================================
# SINGLE SERVICE INSTANCE
# =========================================================

ai_service = AIService()