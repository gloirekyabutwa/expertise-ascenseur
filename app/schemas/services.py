from typing import Optional, List, Any
import uuid
from pydantic import BaseModel

# Service Type
class ServiceTypeBase(BaseModel):
    code: str
    label: str
    is_active: bool = True

class ServiceTypeCreate(ServiceTypeBase):
    pass

class ServiceTypeResponse(ServiceTypeBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    
    class Config:
        from_attributes = True

# Checklist Item
class ChecklistItemBase(BaseModel):
    section: Optional[str] = None
    label: str
    item_type: str # BOOLEAN, TEXT, NUMBER, CHOICE, PHOTO
    required: bool = False
    order_index: int = 0
    config_json: Optional[dict] = None

class ChecklistItemCreate(ChecklistItemBase):
    pass

class ChecklistItemResponse(ChecklistItemBase):
    id: uuid.UUID
    template_id: uuid.UUID
    tenant_id: uuid.UUID
    
    class Config:
        from_attributes = True

# Checklist Template
class ChecklistTemplateBase(BaseModel):
    version: str
    title: str
    description: Optional[str] = None
    is_active: bool = True

class ChecklistTemplateCreate(ChecklistTemplateBase):
    service_type_id: uuid.UUID
    items: Optional[List[ChecklistItemCreate]] = []

class ChecklistTemplateResponse(ChecklistTemplateBase):
    id: uuid.UUID
    service_type_id: uuid.UUID
    tenant_id: uuid.UUID
    items: List[ChecklistItemResponse] = []
    
    class Config:
        from_attributes = True
