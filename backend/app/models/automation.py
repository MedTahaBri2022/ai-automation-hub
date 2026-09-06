from sqlalchemy import Column, Integer, String, Text

from app.core.database import Base


class Automation(Base):
    __tablename__ = "automations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    status = Column(
        String(50),
        default="created"
    )


    