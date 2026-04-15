from typing import Optional, List, Any
import uuid
from datetime import datetime
from pydantic import BaseModel

# Evidence
class EvidenceBase(BaseModel):
    kind: str # PHOTO, FILE, NOTE
    note_text: Optional[str] = None
    document_file_id: Optional[uuid.UUID] = None

class EvidenceCreate(EvidenceBase):
    pass

class EvidenceResponse(EvidenceBase):
    id: uuid.UUID
    finding_id: uuid.UUID
    tenant_id: uuid.UUID
    
    class Config:
        from_attributes = True

# Finding
class FindingBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None

class FindingCreate(FindingBase):
    mission_id: uuid.UUID
    checklist_run_item_id: Optional[uuid.UUID] = None

class FindingUpdate(BaseModel):
    status: Optional[str] = None # OPEN, IN_PROGRESS, RESOLVED, REJECTED, CLOSED
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class FindingResponse(FindingBase):
    id: uuid.UUID
    mission_id: uuid.UUID
    checklist_run_item_id: Optional[uuid.UUID]
    tenant_id: uuid.UUID
    status: str
    resolved_at: Optional[datetime]
    evidences: List[EvidenceResponse] = []
    
    class Config:
        from_attributes = True

# Comment
class CommentCreate(BaseModel):
    body: str

class CommentResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    body: str
    created_by: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

# Documents
class DocumentBase(BaseModel):
    doc_type: str # REPORT, PV, RAAT, OTHER
    title: Optional[str] = None

class DocumentCreate(DocumentBase):
    mission_id: Optional[uuid.UUID] = None
    finding_id: Optional[uuid.UUID] = None

class DocumentFileResponse(BaseModel):
    id: uuid.UUID
    object_key: str
    size_bytes: Optional[int]
    mime_type: Optional[str]
    version: int
    
    class Config:
        from_attributes = True

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    mission_id: Optional[uuid.UUID]
    finding_id: Optional[uuid.UUID]
    status: str
    files: List[DocumentFileResponse] = []

    class Config:
        from_attributes = True

class PresignedUrlResponse(BaseModel):
    url: str
    method: str
