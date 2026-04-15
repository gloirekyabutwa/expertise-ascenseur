from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base, TenantMixin

class ServiceType(Base, TenantMixin):
    __tablename__ = "service_types"
    code: Mapped[str] = mapped_column(String(50), nullable=False) # CTQ, AMO
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ChecklistTemplate(Base, TenantMixin):
    __tablename__ = "checklist_templates"
    service_type_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("service_types.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    items: Mapped[list["ChecklistItem"]] = relationship("ChecklistItem", back_populates="template", order_by="ChecklistItem.order_index")


class ChecklistItem(Base, TenantMixin):
    __tablename__ = "checklist_items"
    template_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id"), nullable=False)
    section: Mapped[Optional[str]] = mapped_column(String(255))
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    item_type: Mapped[str] = mapped_column(String(50), nullable=False) 
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    config_json: Mapped[Optional[dict]] = mapped_column(JSONB)

    template: Mapped["ChecklistTemplate"] = relationship("ChecklistTemplate", back_populates="items")
