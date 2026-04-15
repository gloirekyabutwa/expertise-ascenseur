from typing import Optional, List
from uuid import UUID
from datetime import date
from pydantic import BaseModel

# --- Attendees ---

class MissionAttendeeBase(BaseModel):
    full_name: str
    role: str = "Tiers"
    company: Optional[str] = None
    is_present: bool = False

class MissionAttendeeCreate(MissionAttendeeBase):
    pass

class MissionAttendeeUpdate(MissionAttendeeBase):
    pass

class MissionAttendeeResponse(MissionAttendeeBase):
    id: UUID
    mission_id: UUID

    class Config:
        from_attributes = True

# --- Documents ---

class MissionDocumentProvidedBase(BaseModel):
    document_name: str
    is_provided: bool = False
    is_applicable: bool = True
    comment: Optional[str] = None
    document_date: Optional[date] = None

class MissionDocumentProvidedCreate(MissionDocumentProvidedBase):
    pass

class MissionDocumentProvidedUpdate(MissionDocumentProvidedBase):
    pass

class MissionDocumentProvidedResponse(MissionDocumentProvidedBase):
    id: UUID
    mission_id: UUID

    class Config:
        from_attributes = True

# --- Previous Controls ---

class MissionPreviousControlBase(BaseModel):
    control_date: date
    control_type: str
    report_number: Optional[str] = None
    technician_name: Optional[str] = None
    result: Optional[str] = None
    observations: Optional[str] = None

class MissionPreviousControlCreate(MissionPreviousControlBase):
    pass

class MissionPreviousControlUpdate(MissionPreviousControlBase):
    pass

class MissionPreviousControlResponse(MissionPreviousControlBase):
    id: UUID
    mission_id: UUID

    class Config:
        from_attributes = True

# --- Work Items ---

class MissionWorkItemBase(BaseModel):
    work_description: str
    deadline_year: Optional[int] = None
    status: str = "PENDING" # PENDING, DONE

class MissionWorkItemCreate(MissionWorkItemBase):
    pass

class MissionWorkItemUpdate(MissionWorkItemBase):
    pass

class MissionWorkItemResponse(MissionWorkItemBase):
    id: UUID
    mission_id: UUID

    class Config:
        from_attributes = True

# --- Unified Update Payload (optional, for bulk updates) ---

class MissionComplianceUpdate(BaseModel):
    attendees: Optional[List[MissionAttendeeCreate]] = None
    documents: Optional[List[MissionDocumentProvidedCreate]] = None
    previous_controls: Optional[List[MissionPreviousControlCreate]] = None
    work_items: Optional[List[MissionWorkItemCreate]] = None

# --- Bundle (Optimization for Frontend) ---

# We need to forward ref or import specific schemas. 
# Ideally we import from checklist, but circular imports might be an issue if checklist imports compliance.
# Let's use simple dicts or "Any" for now, or better: import inside the router and construct custom Response there?
# No, let's try to do it clean.
# checklist.py depends on nothing from compliance.py.
# So compliance.py can import from checklist.py? No, it's safer to have a separate "responses" module or just do it here if no cycle.
 
class MissionComplianceBundle(BaseModel):
    attendees: List[MissionAttendeeResponse]
    documents: List[MissionDocumentProvidedResponse]
    previous_controls: List[MissionPreviousControlResponse]
    work_items: List[MissionWorkItemResponse]
    
    # Checklist & Anomalies included? Yes for full view.
    # We use ForwardRef or "Any" to avoid circular dep if any. 
    # But schemas usually don't cycle unless relationships are bidirectional.
    checklist_results: List["MissionChecklistResultResponse"]
    anomalies: List["MissionAnomalyResponse"]
    
    class Config:
        from_attributes = True

from app.schemas.checklist import MissionChecklistResultResponse, MissionAnomalyResponse
MissionComplianceBundle.update_forward_refs()
