from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

# --- Catalog ---

class ChecklistCatalogResponse(BaseModel):
    id: UUID
    parent_id: Optional[UUID] = None
    code: str
    label: str
    description: Optional[str] = None
    order_index: int
    item_type: str # GROUP, ITEM
    field_type: str # BOOL, MEASURE, TEXT
    unit: Optional[str] = None
    
    # Children for recursive loading (if needed, but maybe flat list is better for frontend)
    # children: List["ChecklistCatalogResponse"] = []

    class Config:
        from_attributes = True

class AnomalyCatalogResponse(BaseModel):
    id: UUID
    code: str
    description: str
    criticality: str # NORMAL, HIGH

    class Config:
        from_attributes = True

# --- Mission Results ---

class MissionChecklistResultBase(BaseModel):
    catalog_item_id: UUID
    status: str # CONCERNED, NOT_CONCERNED, NOT_CHECKED
    investigation_nature: Optional[str] = None # P, E, R, F
    result_value: Optional[str] = None
    observation_code: Optional[str] = None
    comment: Optional[str] = None

class MissionChecklistResultCreate(BaseModel):
    catalog_item_id: UUID
    status: Optional[str] = None  # If None, won't overwrite existing
    investigation_nature: Optional[str] = None
    result_value: Optional[str] = None
    observation_code: Optional[str] = None
    comment: Optional[str] = None
    
class MissionChecklistResultUpdate(BaseModel):
    status: Optional[str] = None
    investigation_nature: Optional[str] = None
    result_value: Optional[str] = None
    observation_code: Optional[str] = None
    comment: Optional[str] = None

class MissionChecklistResultResponse(MissionChecklistResultBase):
    id: UUID
    mission_id: UUID

    class Config:
        from_attributes = True

# --- Mission Anomalies ---

class MissionAnomalyBase(BaseModel):
    catalog_anomaly_id: Optional[UUID] = None
    custom_code: Optional[str] = None
    custom_description: Optional[str] = None
    status: str = "OPEN"
    comment: Optional[str] = None
    # Usually frontend sends either ID or Custom fields

class MissionAnomalyCreate(MissionAnomalyBase):
    pass

class MissionAnomalyUpdate(MissionAnomalyBase):
    pass

class MissionAnomalyResponse(MissionAnomalyBase):
    id: UUID
    mission_id: UUID
    # Include catalog details if loaded?
    catalog_anomaly: Optional[AnomalyCatalogResponse] = None

    class Config:
        from_attributes = True
