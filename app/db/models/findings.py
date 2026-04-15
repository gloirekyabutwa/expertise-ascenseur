from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin

class Finding(Base, TenantMixin):
    __tablename__ = "findings"
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False)
    checklist_run_item_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_run_items.id"))
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String(50), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    
    assigned_to: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    mission: Mapped["Mission"] = relationship("Mission", back_populates="findings")
    evidences: Mapped[list["Evidence"]] = relationship("Evidence", back_populates="finding")


class Evidence(Base, TenantMixin):
    __tablename__ = "evidences"
    finding_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("findings.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    document_file_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("document_files.id"))
    note_text: Mapped[Optional[str]] = mapped_column(String)

    finding: Mapped["Finding"] = relationship("Finding", back_populates="evidences")


class Comment(Base, TenantMixin):
    __tablename__ = "comments"
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
