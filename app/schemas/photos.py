from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class MissionPhotoBase(BaseModel):
    description: Optional[str] = None
    checklist_result_id: Optional[UUID] = None
    anomaly_id: Optional[UUID] = None
    captured_at: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MissionPhotoCreate(MissionPhotoBase):
    mission_id: UUID
    # The actual file is uploaded, so object_key and metadata are generated server-side.

class MissionPhotoUpdate(BaseModel):
    description: Optional[str] = None
    checklist_result_id: Optional[UUID] = None
    anomaly_id: Optional[UUID] = None

class MissionPhotoResponse(MissionPhotoBase):
    id: UUID
    mission_id: UUID
    object_key: str
    filename: Optional[str]
    mime_type: Optional[str]
    size_bytes: Optional[int]
    
    # We will generate a presigned URL on the fly for the response
    url: Optional[str] = None

    class Config:
        from_attributes = True
