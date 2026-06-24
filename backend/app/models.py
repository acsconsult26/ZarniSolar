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


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)  # "panel" | "inverter" | "battery"
    brand = Column(String, nullable=False, default="")
    model_name = Column(String, nullable=False, default="")
    # numeric rating + its unit, e.g. 650 "W" / 60 "kW" / 12 "kWh"
    unit_value = Column(Integer, nullable=True)
    unit_label = Column(String, nullable=True)
    specs = Column(JSON, nullable=False, default=list)  # list of "label: value" spec lines
    warranty_line = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Boilerplate(Base):
    """Generic key/value store for all FIXED admin-editable content,
    field defaults, and the slide-19 image prompt template."""

    __tablename__ = "boilerplate"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=False)
