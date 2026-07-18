import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    """A logged-in staff/admin account. Replaces the single env-var admin."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False, default="")
    role = Column(String, nullable=False, default="staff")  # "admin" | "staff"
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class Client(Base):
    """The customer/company a proposal is for. One client can have several
    projects (proposals) over time."""

    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    projects = relationship("Project", back_populates="client")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False, default="Untitled Project")
    status = Column(String, nullable=False, default="draft")  # "draft" | "exported"
    data = Column(JSON, nullable=False, default=dict)  # all form field values
    uploads = Column(JSON, nullable=False, default=dict)  # field_name -> stored file path
    slide19_image_path = Column(String, nullable=True)
    flowchart_image_path = Column(String, nullable=True)
    export_count = Column(Integer, nullable=False, default=0)
    last_exported_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    client = relationship("Client", back_populates="projects")


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
    spec_title = Column(String, nullable=True)  # heading shown on slides 14-16
    specs = Column(JSON, nullable=False, default=list)  # list of {label, value, unit}
    warranty_line = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Boilerplate(Base):
    """Generic key/value store for all FIXED admin-editable content,
    field defaults, and the slide-19 image prompt template."""

    __tablename__ = "boilerplate"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=False)
