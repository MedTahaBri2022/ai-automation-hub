from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String(255), nullable=False)

    rows = Column(Integer, nullable=True)

    columns = Column(Integer, nullable=True)

    summary = Column(Text, nullable=True)

    analysis_json = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
