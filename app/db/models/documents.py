from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, UniqueConstraint, Float
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin

class Document(Base, TenantMixin):
    __tablename__ = "documents"
    
    mission_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"))
    finding_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("findings.id"))
    
    doc_type: Mapped[str] = mapped_column(String(50), default="OTHER") # REPORT, PV, RAAT, OTHER
    status: Mapped[str] = mapped_column(String(50), default="DRAFT") # DRAFT, FINAL
    title: Mapped[Optional[str]] = mapped_column(String(255))

    files: Mapped[list["DocumentFile"]] = relationship("DocumentFile", back_populates="document")


class DocumentFile(Base, TenantMixin):
    __tablename__ = "document_files"
    __table_args__ = (
        UniqueConstraint('document_id', 'version', name='uq_document_version'),
    )

    document_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    
    storage_provider: Mapped[str] = mapped_column(String(50), default="MINIO") # MINIO, S3, GCS
    object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    checksum_sha256: Mapped[Optional[str]] = mapped_column(String(64))
    version: Mapped[int] = mapped_column(Integer, default=1)
    
    document: Mapped["Document"] = relationship("Document", back_populates="files")

class MissionPhoto(Base, TenantMixin):
    __tablename__ = "mission_photos"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False)
    
    # Storage reference
    storage_provider: Mapped[str] = mapped_column(String(50), default="MINIO")
    object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    
    # Optional associations
    checklist_result_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("mission_checklist_results.id"))
    anomaly_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("mission_anomalies.id"))
    
    # Metadata
    filename: Mapped[Optional[str]] = mapped_column(String(255))
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Location/Time (useful for inspection evidence)
    captured_at: Mapped[Optional[str]] = mapped_column(String(100))
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    
    # relationships
    # The relationships might need to be explicitly declared if we want back_populates,
    # but for now, forward foreign keys are sufficient for MVP.
