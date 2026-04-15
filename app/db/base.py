from typing import Any
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.schema import ForeignKey

@as_declarative()
class Base:
    id: Any
    __name__: str
    
    # We will manually set __tablename__ in models to match spec (audit_logs, service_types etc)
    # But provide a default for simple cases
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(default=False)


class TenantMixin:
    """
    Mixin to add tenant_id to a model and enforce tenant isolation.
    """
    @declared_attr
    def tenant_id(cls) -> Mapped[uuid.UUID]:
        return mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
