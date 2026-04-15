from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, RoleChecker
from app.db.models.tenants_and_assets import User
from app.db.models.pdf import PdfRenderRequest, PdfTemplate, PdfRenderStatus, PdfTemplateStatus
from app.db.models.documents import DocumentFile
from app.schemas.pdf import PdfRenderRequestCreate, PdfRenderRequestResponse, PdfTemplateCreate, PdfTemplateResponse
from app.services.pdf import run_pdf_generation

router = APIRouter()

@router.post("/pdf-render", response_model=PdfRenderRequestResponse, status_code=status.HTTP_202_ACCEPTED)
def create_render_request(
    request_in: PdfRenderRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    # RBAC enforced via RoleChecker dependency (Hardening #6)

    # Verify entity exists/access (RLS handles tenant isolation, but entity existence check good practice)
    # The service will check it during processing too, but failing fast is good.
    # For now, trust RLS and service.
    
    # Create DB entry
    db_request = PdfRenderRequest(
        tenant_id=current_user.tenant_id,
        entity_type=request_in.entity_type,
        entity_id=request_in.entity_id,
        doc_type=request_in.doc_type,
        template_id=request_in.template_id,
        status=PdfRenderStatus.QUEUED,
        payload_json={} # Will be populated by worker
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Enqueue task with Tenant Context
    background_tasks.add_task(run_pdf_generation, db_request.id, current_user.tenant_id)
    
    return db_request

@router.get("/pdf-render/{request_id}", response_model=PdfRenderRequestResponse)
def get_render_status(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.query(PdfRenderRequest).filter(PdfRenderRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Generate download URL if successful
    response = PdfRenderRequestResponse.model_validate(request)
    print(f"DEBUG: Request {request.id} status={request.status} ver_id={request.output_document_version_id}")
    
    if request.status == PdfRenderStatus.SUCCEEDED and request.output_document_version_id:
        doc_file = db.query(DocumentFile).filter(DocumentFile.id == request.output_document_version_id).first()
        print(f"DEBUG: DocFile found={doc_file is not None} key={doc_file.object_key if doc_file else 'None'}")
        
        if doc_file and doc_file.object_key:
            from app.services.storage.minio_storage import storage
            try:
                url = storage.get_presigned_url(doc_file.object_key)
                print(f"DEBUG: Generated URL={url}")
                response.download_url = url
            except Exception as e:
                print(f"Error generating presigned URL: {e}")
                
    return response

class GeneratePdfRequest(BaseModel):
    template_type: str = "FULL"
    include_photos: bool = True

@router.post("/missions/{mission_id}/generate-pdf", response_model=PdfRenderRequestResponse, status_code=status.HTTP_202_ACCEPTED)
def render_mission_report(
    mission_id: UUID,
    background_tasks: BackgroundTasks,
    request_data: GeneratePdfRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    from app.db.models.missions import Mission
    from app.db.models.services import ServiceType
    from sqlalchemy.orm import joinedload
    
    mission = db.query(Mission).options(joinedload(Mission.service_type)).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    doc_type = "GENERIC_REPORT"
    if mission.service_type and mission.service_type.code:
        code = mission.service_type.code
        if code in ["CTQ-5", "CTQ"]:
            doc_type = "CTQ_REPORT"
        elif code == "AMO":
            doc_type = "AMO_REPORT"
        elif code == "AMIANTE":
            doc_type = "AMIANTE_REPORT"
            
    # 1. auto-pick active template
    template = db.query(PdfTemplate).filter(
        PdfTemplate.code.like(f"{doc_type}%"),
        PdfTemplate.status == PdfTemplateStatus.ACTIVE
    ).order_by(PdfTemplate.version.desc()).first()
    
    if not template and doc_type != "GENERIC_REPORT":
        doc_type = "GENERIC_REPORT"
        template = db.query(PdfTemplate).filter(
            PdfTemplate.code.like("GENERIC_REPORT%"),
            PdfTemplate.status == PdfTemplateStatus.ACTIVE
        ).order_by(PdfTemplate.version.desc()).first()

    if not template:
        # Final fallback to CTQ
        doc_type = "CTQ_REPORT"
        template = db.query(PdfTemplate).filter(
            PdfTemplate.code.like("CTQ_REPORT%"),
            PdfTemplate.status == PdfTemplateStatus.ACTIVE
        ).order_by(PdfTemplate.version.desc()).first()
        if not template:
            raise HTTPException(status_code=400, detail="No active template found")
        
    # 2. Create Request
    options = {}
    if request_data:
        options["template_type"] = request_data.template_type
        options["include_photos"] = request_data.include_photos
        
    db_request = PdfRenderRequest(
        tenant_id=current_user.tenant_id,
        entity_type="MISSION",
        entity_id=mission_id,
        doc_type="CTQ_REPORT",
        template_id=template.id,
        status=PdfRenderStatus.QUEUED,
        payload_json={"options": options}
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # 3. Enqueue
    background_tasks.add_task(run_pdf_generation, db_request.id, current_user.tenant_id)
    
    return db_request

# --- Template Management (Admin) ---
@router.post("/pdf-templates", response_model=PdfTemplateResponse)
def create_template(
    template_in: PdfTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    template = PdfTemplate(
        tenant_id=current_user.tenant_id,
        **template_in.model_dump()
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.get("/pdf-templates", response_model=List[PdfTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(PdfTemplate).all()
