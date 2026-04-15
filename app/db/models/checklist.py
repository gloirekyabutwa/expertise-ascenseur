from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base import Base, TenantMixin

class ChecklistCatalog(Base):
    """
    Global catalog of checklist items (not tenant-scoped usually).
    Hierarchical structure: Gaine -> Portes Palières -> ...
    """
    __tablename__ = "checklist_categories"
    
    parent_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_categories.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "I.1"
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    
    # "GROUP", "ITEM"
    item_type: Mapped[str] = mapped_column(String(20), default="ITEM") 
    
    # "BOOL", "MEASURE", "TEXT"
    field_type: Mapped[str] = mapped_column(String(20), default="BOOL")
    unit: Mapped[Optional[str]] = mapped_column(String(20)) # e.g. "m/s", "kg"
    
    parent: Mapped["ChecklistCatalog"] = relationship("ChecklistCatalog", remote_side="[ChecklistCatalog.id]", backref="children")

class AnomalyCatalog(Base):
    """
    Standard references for anomalies
    """
    __tablename__ = "anomaly_catalog"
    
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # e.g. "1 A"
    description: Mapped[str] = mapped_column(Text, nullable=False)
    criticality: Mapped[str] = mapped_column(String(20), default="NORMAL") # NORMAL, HIGH

class MissionChecklistResult(Base, TenantMixin):
    """
    Flattened results for a mission linked to the catalog.
    Replaces the generic 'ChecklistRunItem' for the specific CTQ needs if strictly compliant.
    Or we can map ChecklistRunItem to this. 
    Let's use this dedicated table for the 'Section 9' pixel-perfect compliance.
    """
    __tablename__ = "mission_checklist_results"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    catalog_item_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_categories.id"), nullable=False)
    
    # "CONCERNED", "NOT_CONCERNED", "NOT_CHECKED"
    status: Mapped[str] = mapped_column(String(50), default="CONCERNED") 
    
    # "P" (Parfait), "E" (Etat), "R" (Réglage), "F" (Fonctionnement)
    investigation_nature: Mapped[Optional[str]] = mapped_column(String(10)) 
    
    result_value: Mapped[Optional[str]] = mapped_column(String(255))
    comment: Mapped[Optional[str]] = mapped_column(Text)
    
    observation_code: Mapped[Optional[str]] = mapped_column(String(50)) # Link to anomaly code or free text if needed
    
    mission: Mapped["Mission"] = relationship("Mission", back_populates="checklist_results")
    catalog_item: Mapped["ChecklistCatalog"] = relationship("ChecklistCatalog")

class MissionAnomaly(Base, TenantMixin):
    __tablename__ = "mission_anomalies"
    
    mission_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id"), nullable=False, index=True)
    catalog_anomaly_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("anomaly_catalog.id"))
    
    # If custom anomaly not in catalog
    custom_code: Mapped[Optional[str]] = mapped_column(String(50))
    custom_description: Mapped[Optional[str]] = mapped_column(Text)
    
    status: Mapped[str] = mapped_column(String(20), default="OPEN") # OPEN, RESOLVED
    comment: Mapped[Optional[str]] = mapped_column(Text)
    
    mission: Mapped["Mission"] = relationship("Mission", back_populates="anomalies")
    catalog_anomaly: Mapped["AnomalyCatalog"] = relationship("AnomalyCatalog")
