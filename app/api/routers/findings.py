from typing import List, Optional
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Finding, Evidence, Comment, Mission, Tenant
from app.schemas.findings_documents import FindingCreate, FindingResponse, FindingUpdate, EvidenceCreate, EvidenceResponse, CommentCreate, CommentResponse
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

@router.get("/findings", response_model=List[FindingResponse])
def read_findings(
    mission_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(Finding).filter(Finding.tenant_id == current_tenant.id)
    
    if mission_id:
        query = query.filter(Finding.mission_id == mission_id)
    if status:
        query = query.filter(Finding.status == status)
    if severity:
        query = query.filter(Finding.severity == severity)
        
    return query.offset(skip).limit(limit).all()

@router.post("/findings", response_model=FindingResponse)
def create_finding(
    finding: FindingCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # Verify mission exists
    mission = db.query(Mission).filter(Mission.id == finding.mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    db_finding = Finding(
        **finding.dict(),
        status="OPEN",
        tenant_id=current_tenant.id
    )
    db.add(db_finding)
    db.commit()
    db.refresh(db_finding)
    return db_finding

@router.patch("/findings/{finding_id}", response_model=FindingResponse)
def update_finding(
    finding_id: uuid.UUID,
    finding_update: FindingUpdate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_finding = db.query(Finding).filter(Finding.id == finding_id, Finding.tenant_id == current_tenant.id).first()
    if not db_finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    update_data = finding_update.dict(exclude_unset=True)
    if update_data.get("status") == "RESOLVED" and not db_finding.resolved_at:
        # Check logic: RESOLVED requires evidence or comment.
        # For simplicity, we just set resolved_at here. 
        # Real logic should check relationships.
        has_evidence = db.query(Evidence).filter(Evidence.finding_id == finding_id).count() > 0
        has_comment = db.query(Comment).filter(Comment.entity_id == finding_id, Comment.entity_type == "FINDING").count() > 0
        
        if not (has_evidence or has_comment):
            raise HTTPException(status_code=400, detail="Cannot resolve finding without evidence or comment")
        
        update_data["resolved_at"] = datetime.utcnow()
        
    for key, value in update_data.items():
        setattr(db_finding, key, value)
    
    db.add(db_finding)
    db.commit()
    db.refresh(db_finding)
    return db_finding

@router.post("/findings/{finding_id}/evidences", response_model=EvidenceResponse)
def create_finding_evidence(
    finding_id: uuid.UUID,
    evidence: EvidenceCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_finding = db.query(Finding).filter(Finding.id == finding_id, Finding.tenant_id == current_tenant.id).first()
    if not db_finding:
        raise HTTPException(status_code=404, detail="Finding not found")
        
    db_evidence = Evidence(
        **evidence.dict(),
        finding_id=finding_id,
        tenant_id=current_tenant.id
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence

@router.post("/findings/{finding_id}/comments", response_model=CommentResponse)
def create_finding_comment(
    finding_id: uuid.UUID,
    comment: CommentCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
    # In real app, we need current_user to set created_by
    # For now we might need to mock or pass user_id via header/token
):
    # Retrieve user from context (skipping for brevity, assuming standard way exists)
    # Using a dummy user for MVP or picking first user
    user = db.query(app.db.models.User).filter(app.db.models.User.tenant_id == current_tenant.id).first()
    
    db_comment = Comment(
        entity_type="FINDING",
        entity_id=finding_id,
        body=comment.body,
        created_by=user.id if user else uuid.uuid4(),
        tenant_id=current_tenant.id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment
