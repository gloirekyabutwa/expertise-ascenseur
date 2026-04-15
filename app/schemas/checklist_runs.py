from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel

# Checklist Run Item
class ChecklistRunItemBase(BaseModel):
    value_json: Optional[Dict[str, Any]] = None
    status: str = "NA" # OK, NOK, NA
    note: Optional[str] = None

class ChecklistRunItemUpdate(ChecklistRunItemBase):
    pass

class ChecklistRunItemResponse(ChecklistRunItemBase):
    id: uuid.UUID
    run_id: uuid.UUID
    checklist_item_id: uuid.UUID
    tenant_id: uuid.UUID
    
    class Config:
        from_attributes = True

# Checklist Run
class ChecklistRunBase(BaseModel):
    status: str = "NOT_STARTED" # NOT_STARTED, RUNNING, SUBMITTED

class ChecklistRunCreate(BaseModel):
    mission_id: uuid.UUID
    template_id: uuid.UUID

class ChecklistRunUpdate(BaseModel):
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None

class ChecklistRunResponse(ChecklistRunBase):
    id: uuid.UUID
    mission_id: uuid.UUID
    template_id: uuid.UUID
    tenant_id: uuid.UUID
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    items: List[ChecklistRunItemResponse] = []
    
    class Config:
        from_attributes = True
