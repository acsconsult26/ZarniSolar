import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship

from .db import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Untitled Project")
    data = Column(JSON, nullable=False, default=dict)  # all form field values
    uploads = Column(JSON, nullable=False, default=dict)  # field_name -> stored file path
    slide19_image_path = Column(String, nullable=True)
    flowchart_image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ReferenceImage(Base):
    __tablename__ = "reference_images"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, nullable=False)
    tag = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Boilerplate(Base):
    """Generic key/value store for all FIXED admin-editable content,
    field defaults, and the slide-19 image prompt template."""

    __tablename__ = "boilerplate"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=False)
