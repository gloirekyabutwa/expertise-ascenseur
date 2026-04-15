from typing import Optional
from datetime import date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Integer, Date, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base, TenantMixin

class TenantAgency(Base, TenantMixin):
    __tablename__ = "tenant_agencies"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    region: Mapped[Optional[str]] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    fax: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    
    tenant_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="agencies_list")

class MissionAttendee(Base, TenantMixin):
    __tablename__ = "mission_attendees"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Optional[str]] = mapped_column(String(100)) # e.g. "Technicien", "Propriétaire"
    company: Mapped[Optional[str]] = mapped_column(String(255))
    is_present: Mapped[bool] = mapped_column(Boolean, default=True)
    
    mission: Mapped["Mission"] = relationship("Mission", back_populates="attendees")

class MissionDocumentProvided(Base, TenantMixin):
    __tablename__ = "mission_documents_provided"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_provided: Mapped[bool] = mapped_column(Boolean, default=False) # P (Provided) vs NP (Not Provided)
    is_applicable: Mapped[bool] = mapped_column(Boolean, default=True) # NC (Not Concerned)
    observation_code: Mapped[Optional[str]] = mapped_column(String(50)) # Link to anomaly if needed, or just code like "1B"
    comment: Mapped[Optional[str]] = mapped_column(String(500))

    mission: Mapped["Mission"] = relationship("Mission", back_populates="documents_provided")

class MissionPreviousControl(Base, TenantMixin):
    __tablename__ = "mission_previous_controls"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    
    control_date: Mapped[date] = mapped_column(Date, nullable=False)
    control_type: Mapped[str] = mapped_column(String(100)) # e.g. "Contrôle Technique", "Etude de sécurité"
    technician_name: Mapped[Optional[str]] = mapped_column(String(255))
    report_number: Mapped[Optional[str]] = mapped_column(String(100))
    result: Mapped[Optional[str]] = mapped_column(String(500)) # Summary of result

    mission: Mapped["Mission"] = relationship("Mission", back_populates="previous_controls")

class RegulatoryTextBlock(Base):
    """
    Catalog of legal texts to be displayed in reports.
    Not tenant-scoped usually, but could be if customized.
    For now, global catalog.
    """
    __tablename__ = "regulatory_text_blocks"
    
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False) # e.g. "HEADER_LEGAL_TEXT"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    section_reference: Mapped[Optional[str]] = mapped_column(String(50)) # e.g. "SECTION_1"

class MissionWorkItem(Base, TenantMixin):
    __tablename__ = "mission_work_items"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    
    deadline_year: Mapped[Optional[int]] = mapped_column(Integer) # e.g. 2010, 2014, 2018
    work_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="TODO") # TODO, DONE, NA
    observation_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    mission: Mapped["Mission"] = relationship("Mission", back_populates="work_items")

class Attachment(Base, TenantMixin):
    __tablename__ = "attachments"
    
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False) # "MISSION", "TENANT", "USER"
    entity_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    attachment_type: Mapped[str] = mapped_column(String(50), nullable=False) # "SIGNATURE", "STAMP", "PHOTO"
    file_path: Mapped[str] = mapped_column(String(500), nullable=False) # S3 or local path
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    created_at: Mapped[date] = mapped_column(Date, default=date.today)
