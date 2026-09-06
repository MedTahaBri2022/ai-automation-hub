import pandas as pd


def analyze_dataframe(df: pd.DataFrame):

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    return {
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist(),
        "numeric_columns": numeric_columns,
        "missing_values": int(
            df.isnull().sum().sum()
        ),
        "summary": df[numeric_columns]
        .describe()
        .to_dict()
        if numeric_columns
        else {}
    }