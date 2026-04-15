from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, Enum as SAEnum, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
import enum

from app.db.base import Base, TenantMixin

class PdfTemplateEngine(str, enum.Enum):
    WEASYPRINT = "WEASYPRINT"

class PdfTemplateStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class PdfRenderStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"

class PdfTemplate(Base, TenantMixin):
    __tablename__ = "pdf_templates"
    
    code: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. CTQ_REPORT_V1
    version: Mapped[int] = mapped_column(Integer, default=1)
    engine: Mapped[PdfTemplateEngine] = mapped_column(SAEnum(PdfTemplateEngine), default=PdfTemplateEngine.WEASYPRINT)
    status: Mapped[PdfTemplateStatus] = mapped_column(SAEnum(PdfTemplateStatus), default=PdfTemplateStatus.ACTIVE)
    
    template_path: Mapped[str] = mapped_column(String(255), nullable=False)
    style_path: Mapped[Optional[str]] = mapped_column(String(255))
    
    assets_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    schema_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Enforce unique code within a tenant
    __table_args__ = (
        UniqueConstraint('tenant_id', 'code', name='uq_pdf_template_tenant_code'),
    )

class PdfRenderRequest(Base, TenantMixin):
    __tablename__ = "pdf_render_requests"
    
    entity_type: Mapped[str] = mapped_column(String(50)) # MISSION
    entity_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True))
    
    doc_type: Mapped[str] = mapped_column(String(50)) # CTQ_REPORT
    
    template_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pdf_templates.id"))
    
    status: Mapped[PdfRenderStatus] = mapped_column(SAEnum(PdfRenderStatus), default=PdfRenderStatus.QUEUED)
    
    payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    error: Mapped[Optional[str]] = mapped_column(String)
    
    # Retry tracking for failed requests
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    
    output_document_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"))
    output_document_version_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("document_files.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    template: Mapped["PdfTemplate"] = relationship("PdfTemplate")

