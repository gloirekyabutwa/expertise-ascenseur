from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

# --- Inner Models ---

class TenantInfo(BaseModel):
    name: str
    branding_logo_url: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    siret: Optional[str] = None
    capital: Optional[str] = None
    vat_id: Optional[str] = None
    ape_code: Optional[str] = None
    legal_mentions: Optional[str] = None
    agencies: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class DocumentInfo(BaseModel):
    doc_type: str
    title: str
    generated_at: datetime
    render_request_id: UUID
    version: int = 1
    
    @property
    def generated_at_fr(self) -> str:
        return self.generated_at.strftime("%d / %m / %Y")

class MissionInfo(BaseModel):
    id: UUID
    ref_number: Optional[str] = None # Or just ID
    service_type: str # Label
    scheduled_date: Optional[datetime] = None
    visit_start_datetime: Optional[datetime] = None
    visit_end_datetime: Optional[datetime] = None
    assignee_name: Optional[str] = None
    
    # CTQ Specifics
    client_reference: Optional[str] = None
    certification_number: Optional[str] = None
    signed_at: Optional[datetime] = None
    signed_by_name: Optional[str] = None
    place_signed: Optional[str] = None
    
    # Signature Block
    assignee_role: Optional[str] = "Contrôleur Technique"
    signature_url: Optional[str] = None
    
    @property
    def signed_at_fr(self) -> str:
        if self.signed_at:
            return self.signed_at.strftime("%d / %m / %Y")
        return ""

    model_config = ConfigDict(from_attributes=True)

class SiteInfo(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    postal_code: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AssetInfo(BaseModel):
    label: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    commissioning_date: Optional[date] = None
    maintainer: Optional[str] = None
    
    # CTQ Technical Specs
    installation_number: Optional[str] = None
    year_commissioned: Optional[int] = None
    device_type: Optional[str] = None
    feature_type: Optional[str] = None
    usage_type: Optional[str] = None
    load_capacity: Optional[int] = None
    max_passengers: Optional[int] = None
    nominal_speed: Optional[str] = None
    number_of_levels: Optional[int] = None
    machinery_location: Optional[str] = None
    maintainer_contract_ref: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ClientInfo(BaseModel):
    name: str # e.g. "SYNDIC / PROPRIETAIRE" or actual name
    address: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ChecklistItemInfo(BaseModel):
    label: str
    status: str # OK, NOK, NA
    value: Optional[str] = None # For measurements
    observation: Optional[str] = None
    
class ChecklistSectionInfo(BaseModel):
    title: str
    items: List[ChecklistItemInfo] = []

class FindingInfo(BaseModel):
    id: UUID
    title: str
    severity: str
    status: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    
    model_config = ConfigDict(from_attributes=True)

class AnnexPhotoInfo(BaseModel):
    object_key: str  # Storage key, not URL
    document_file_id: Optional[UUID] = None
    caption: Optional[str] = None
    captured_at: Optional[datetime] = None
    finding_ref: Optional[str] = None # e.g. "Finding #123" if linked
    url: Optional[str] = None # Generated at render time

# --- New Compliance Schemas ---

class MissionAttendeeInfo(BaseModel):
    full_name: str
    role: Optional[str] = None
    company: Optional[str] = None
    is_present: bool = True
    
    model_config = ConfigDict(from_attributes=True)

class MissionDocumentInfo(BaseModel):
    document_name: str
    is_provided: bool
    is_applicable: bool = True
    observation_code: Optional[str] = None
    comment: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MissionPreviousControlInfo(BaseModel):
    control_date: date
    control_type: str
    technician_name: Optional[str] = None
    report_number: Optional[str] = None
    result: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MissionWorkItemInfo(BaseModel):
    deadline_year: Optional[int] = None
    work_description: str
    status: str
    observation_code: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MissionAnomalyInfo(BaseModel):
    code: Optional[str] = None # From catalog or custom
    description: Optional[str] = None
    criticality: Optional[str] = None
    status: str
    comment: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Root Context ---

class PdfContext(BaseModel):
    tenant: TenantInfo
    document: DocumentInfo
    mission: MissionInfo
    site: SiteInfo
    client: Optional[ClientInfo] = None
    asset: AssetInfo
    
    # Checklists & Findings
    checklist_sections: List[ChecklistSectionInfo] = []
    findings: List[FindingInfo] = []
    annexes: List[AnnexPhotoInfo] = []
    
    # CTQ Specifics (New)
    attendees: List[MissionAttendeeInfo] = []
    documents_provided: List[MissionDocumentInfo] = []
    previous_controls: List[MissionPreviousControlInfo] = []
    work_items: List[MissionWorkItemInfo] = []
    anomalies: List[MissionAnomalyInfo] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- API Schemas ---

class PdfRenderRequestCreate(BaseModel):
    doc_type: str
    entity_type: str
    entity_id: UUID
    template_id: UUID
    options: dict = {}

class PdfRenderRequestResponse(BaseModel):
    id: UUID
    status: str
    created_at: datetime
    output_document_id: Optional[UUID] = None
    output_document_version_id: Optional[UUID] = None
    error: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PdfTemplateCreate(BaseModel):
    code: str
    version: int
    engine: str = "WEASYPRINT"
    template_path: str
    style_path: Optional[str] = None
    assets_json: Optional[dict] = None

class PdfTemplateResponse(PdfTemplateCreate):
    id: UUID
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- API Schemas ---

class PdfRenderRequestCreate(BaseModel):
    doc_type: str
    entity_type: str
    entity_id: UUID
    template_id: UUID
    options: dict = {}

class PdfRenderRequestResponse(BaseModel):
    id: UUID
    status: str
    created_at: datetime
    output_document_id: Optional[UUID] = None
    output_document_version_id: Optional[UUID] = None
    download_url: Optional[str] = None
    error: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PdfTemplateCreate(BaseModel):
    code: str
    version: int
    engine: str = "WEASYPRINT"
    template_path: str
    style_path: Optional[str] = None
    assets_json: Optional[dict] = None

class PdfTemplateResponse(PdfTemplateCreate):
    id: UUID
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
