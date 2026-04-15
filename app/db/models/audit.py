from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base, TenantMixin

class AuditLog(Base, TenantMixin):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False) # CREATE, UPDATE, DELETE
    
    before_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    after_json: Mapped[Optional[dict]] = mapped_column(JSONB)
