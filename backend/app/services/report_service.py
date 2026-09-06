import os

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet


REPORTS_DIR = "reports"

os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_pdf_report(
    title: str,
    analysis: dict
):

    filename = title.lower().replace(" ", "_") + ".pdf"

    filepath = os.path.join(
        REPORTS_DIR,
        filename
    )

    document = SimpleDocTemplate(
        filepath,
        pagesize=A4
    )

    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(
            title,
            styles["Title"]
        )
    )

    elements.append(
        Spacer(1, 20)
    )

    # Dataset information

    elements.append(
        Paragraph(
            "Dataset Overview",
            styles["Heading2"]
        )
    )

    dataset_data = [
        ["Metric", "Value"],
        [
            "Rows",
            str(analysis.get("rows", 0))
        ],
        [
            "Columns",
            str(analysis.get("columns", 0))
        ],
        [
            "Missing Values",
            str(
                analysis.get(
                    "missing_values",
                    0
                )
            )
        ]
    ]

    table = Table(dataset_data)

    table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.grey
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.black
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                6
            )
        ])
    )

    elements.append(table)

    elements.append(
        Spacer(1, 20)
    )

    # Columns

    elements.append(
        Paragraph(
            "Columns",
            styles["Heading2"]
        )
    )

    columns = analysis.get(
        "column_names",
        []
    )

    for column in columns:

        elements.append(
            Paragraph(
                f"• {column}",
                styles["Normal"]
            )
        )

    elements.append(
        Spacer(1, 20)
    )

    # Numeric summary

    summary = analysis.get(
        "summary",
        {}
    )

    if summary:

        elements.append(
            Paragraph(
                "Numeric Analysis",
                styles["Heading2"]
            )
        )

        for column, values in summary.items():

            elements.append(
                Paragraph(
                    column,
                    styles["Heading3"]
                )
            )

            for metric, value in values.items():

                elements.append(
                    Paragraph(
                        f"{metric}: {value:.2f}",
                        styles["Normal"]
                    )
                )

    document.build(elements)

    return filepath