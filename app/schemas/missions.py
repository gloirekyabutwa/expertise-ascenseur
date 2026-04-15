from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel

class MissionBase(BaseModel):
    service_type_id: uuid.UUID
    site_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None
    status: str = "DRAFT" # DRAFT, PLANNED, IN_PROGRESS, DONE, CANCELLED
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    assignee_user_id: Optional[uuid.UUID] = None
    metadata_json: Optional[Dict[str, Any]] = None
    
    # CTQ Fields
    client_reference: Optional[str] = None
    certification_number: Optional[str] = None
    owner_malveillance_flag: bool = False
    stop_request_flag: bool = False
    stop_reason: Optional[str] = None
    signed_by_name: Optional[str] = None
    place_signed: Optional[str] = None

class MissionCreate(MissionBase):
    pass

class MissionUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assignee_user_id: Optional[uuid.UUID] = None
    metadata_json: Optional[Dict[str, Any]] = None
    
    # CTQ Fields
    client_reference: Optional[str] = None
    certification_number: Optional[str] = None
    owner_malveillance_flag: Optional[bool] = None
    stop_request_flag: Optional[bool] = None
    stop_reason: Optional[str] = None
    signed_by_name: Optional[str] = None
    place_signed: Optional[str] = None

from app.schemas.assets import AssetResponse, SiteResponse
from app.schemas.services import ServiceTypeResponse

class MissionResponse(MissionBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    
    site: Optional[SiteResponse] = None
    asset: Optional[AssetResponse] = None
    service_type: Optional[ServiceTypeResponse] = None
    
    class Config:
        from_attributes = True
