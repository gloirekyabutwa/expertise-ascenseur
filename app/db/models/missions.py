from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text, Integer, Date # Added Text, Integer, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base, TenantMixin

# Import for type checking mostly, but SQLAlchemy needs to know them if using strings
# strictly string references are fine

class Mission(Base, TenantMixin):
    __tablename__ = "missions"
    service_type_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("service_types.id"), nullable=False)
    site_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"))
    asset_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", index=True)
    
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime)
    scheduled_end: Mapped[Optional[datetime]] = mapped_column(DateTime)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    assignee_user_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Core relationships
    site: Mapped[Optional["Site"]] = relationship("Site", foreign_keys=[site_id])
    asset: Mapped[Optional["Asset"]] = relationship("Asset", foreign_keys=[asset_id])
    service_type: Mapped[Optional["ServiceType"]] = relationship("ServiceType", foreign_keys=[service_type_id])
    
    # Reports extras
    client_reference: Mapped[Optional[str]] = mapped_column(String(100))
    certification_number: Mapped[Optional[str]] = mapped_column(String(100)) # e.g. "CDP-ASC0106"
    
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    checklist_runs: Mapped[list["ChecklistRun"]] = relationship("ChecklistRun", back_populates="mission")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="mission")
    
    # Report Compliance Relationships
    attendees: Mapped[list["MissionAttendee"]] = relationship("MissionAttendee", back_populates="mission")
    documents_provided: Mapped[list["MissionDocumentProvided"]] = relationship("MissionDocumentProvided", back_populates="mission")
    previous_controls: Mapped[list["MissionPreviousControl"]] = relationship("MissionPreviousControl", back_populates="mission")
    work_items: Mapped[list["MissionWorkItem"]] = relationship("MissionWorkItem", back_populates="mission")
    
    # Checklist & Anomalies (Compliance)
    checklist_results: Mapped[list["MissionChecklistResult"]] = relationship("MissionChecklistResult", back_populates="mission")
    anomalies: Mapped[list["MissionAnomaly"]] = relationship("MissionAnomaly", back_populates="mission")
    
    # Flags for Report
    owner_malveillance_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    stop_request_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    stop_reason: Mapped[Optional[str]] = mapped_column(Text)
    
    visit_start_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime)
    visit_end_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime) # serves as report_sign_date
    signed_by_name: Mapped[Optional[str]] = mapped_column(String(255))
    place_signed: Mapped[Optional[str]] = mapped_column(String(255)) # report_sign_city


class ChecklistRun(Base, TenantMixin):
    __tablename__ = "checklist_runs"
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False)
    template_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="NOT_STARTED")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    mission: Mapped["Mission"] = relationship("Mission", back_populates="checklist_runs")
    items: Mapped[list["ChecklistRunItem"]] = relationship("ChecklistRunItem", back_populates="run")


class ChecklistRunItem(Base, TenantMixin):
    __tablename__ = "checklist_run_items"
    run_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_runs.id"), nullable=False)
    checklist_item_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_items.id"), nullable=False)
    
    value_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(50), default="NA")
    note: Mapped[Optional[str]] = mapped_column(String)

    run: Mapped["ChecklistRun"] = relationship("ChecklistRun", back_populates="items")
