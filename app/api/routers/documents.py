from typing import List, Optional
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_active_user, get_db
from app.db.models import Document, DocumentFile, Finding, Mission, Tenant, User
from app.schemas.findings_documents import DocumentCreate, DocumentResponse, PresignedUrlResponse
from app.core.tenancy import get_tenant
from app.services.storage.minio_storage import storage

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
def read_documents(
    asset_id: Optional[uuid.UUID] = None,
    mission_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.tenant_id == current_tenant.id)
    
    if mission_id:
        query = query.filter(Document.mission_id == mission_id)
        
    if asset_id:
        from app.db.models.missions import Mission
        query = query.join(Mission, Document.mission_id == Mission.id).filter(Mission.asset_id == asset_id)

    docs = query.offset(skip).limit(limit).all()
    return docs

@router.get("/{document_id}", response_model=DocumentResponse)
def read_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.tenant_id == current_tenant.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.post("/", response_model=DocumentResponse)
def create_document(
    doc: DocumentCreate,
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    if not doc.mission_id and not doc.finding_id:
        raise HTTPException(status_code=400, detail="A document must be linked to a mission or finding")

    if doc.mission_id:
        mission = db.query(Mission).filter(
            Mission.id == doc.mission_id,
            Mission.tenant_id == current_tenant.id,
        ).first()
        if not mission:
            raise HTTPException(status_code=404, detail="Mission not found")

    if doc.finding_id:
        finding = db.query(Finding).filter(
            Finding.id == doc.finding_id,
            Finding.tenant_id == current_tenant.id,
        ).first()
        if not finding:
            raise HTTPException(status_code=404, detail="Finding not found")

    db_doc = Document(
        **doc.dict(),
        status="DRAFT",
        tenant_id=current_tenant.id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.post("/{document_id}/files:presign-upload", response_model=PresignedUrlResponse)
def presign_upload(
    document_id: uuid.UUID,
    filename: str,
    content_type: str,
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_doc = db.query(Document).filter(Document.id == document_id, Document.tenant_id == current_tenant.id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    safe_filename = os.path.basename(filename)
    if not safe_filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    object_key = f"{current_tenant.id}/{document_id}/{safe_filename}"
    
    # Generate presigned URL (PUT)
    url = storage.get_presigned_url(object_key, method="PUT")
    
    # We anticipate the file entry
    # In a real app, we might wait for confirmation. 
    # Here we can create the record or wait for confirm endpoint.
    return {"url": url, "method": "PUT"}

@router.post("/{document_id}/files:confirm", response_model=DocumentResponse)
def confirm_upload(
    document_id: uuid.UUID,
    filename: str,
    size_bytes: int,
    content_type: str,
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_doc = db.query(Document).filter(Document.id == document_id, Document.tenant_id == current_tenant.id).first()
    if not db_doc:
         raise HTTPException(status_code=404, detail="Document not found")
    
    safe_filename = os.path.basename(filename)
    object_key = f"{current_tenant.id}/{document_id}/{safe_filename}"
    next_version = (
        db.query(func.max(DocumentFile.version))
        .filter(DocumentFile.document_id == document_id)
        .scalar()
        or 0
    ) + 1
    
    db_file = DocumentFile(
        document_id=document_id,
        storage_provider="MINIO",
        object_key=object_key,
        mime_type=content_type,
        size_bytes=size_bytes,
        version=next_version,
        tenant_id=current_tenant.id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.get("/{document_id}/files/{file_id}:presign-download", response_model=PresignedUrlResponse)
def presign_download(
    document_id: uuid.UUID,
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_file = db.query(DocumentFile).filter(
        DocumentFile.id == file_id, 
        DocumentFile.document_id == document_id,
        DocumentFile.tenant_id == current_tenant.id
    ).first()
    
    if not db_file:
         raise HTTPException(status_code=404, detail="File not found")
         
    url = storage.get_presigned_url(db_file.object_key, method="GET")
    return {"url": url, "method": "GET"}
