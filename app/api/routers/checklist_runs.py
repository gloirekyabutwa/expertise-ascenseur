from typing import List
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_active_user
from app.db.models import ChecklistRun, ChecklistRunItem, Mission, ChecklistTemplate, Tenant, ChecklistItem
from app.schemas.checklist_runs import ChecklistRunCreate, ChecklistRunResponse, ChecklistRunUpdate, ChecklistRunItemUpdate, ChecklistRunItemResponse
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

@router.post("/", response_model=ChecklistRunResponse)
def create_checklist_run(
    run_in: ChecklistRunCreate,
    current_user=Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # Verify mission exists
    mission = db.query(Mission).filter(Mission.id == run_in.mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    # Verify template exists
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == run_in.template_id, ChecklistTemplate.tenant_id == current_tenant.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create Run
    db_run = ChecklistRun(
        mission_id=run_in.mission_id,
        template_id=run_in.template_id,
        status="NOT_STARTED",
        tenant_id=current_tenant.id
    )
    db.add(db_run)
    db.commit()
    db.refresh(db_run)
    
    # Initialize Run Items from Template Items
    template_items = db.query(ChecklistItem).filter(ChecklistItem.template_id == template.id, ChecklistItem.tenant_id == current_tenant.id).all()
    run_items = []
    for item in template_items:
        run_item = ChecklistRunItem(
            run_id=db_run.id,
            checklist_item_id=item.id,
            status="NA",
            tenant_id=current_tenant.id
        )
        run_items.append(run_item)
    
    db.add_all(run_items)
    db.commit()
    db.refresh(db_run)
    return db_run

@router.get("/{run_id}", response_model=ChecklistRunResponse)
def read_checklist_run(
    run_id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.tenant_id == current_tenant.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Checklist Run not found")
    return run

@router.patch("/{run_id}", response_model=ChecklistRunResponse)
def update_checklist_run_status(
    run_id: uuid.UUID,
    run_update: ChecklistRunUpdate,
    current_user=Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.tenant_id == current_tenant.id).first()
    if not db_run:
        raise HTTPException(status_code=404, detail="Checklist Run not found")
    
    if run_update.status:
        db_run.status = run_update.status
        if run_update.status == "RUNNING" and not db_run.started_at:
            db_run.started_at = datetime.utcnow()
        if run_update.status == "SUBMITTED":
            db_run.submitted_at = datetime.utcnow()
            
    db.add(db_run)
    db.commit()
    db.refresh(db_run)
    return db_run

@router.patch("/{run_id}/items/{item_id}", response_model=ChecklistRunItemResponse)
def update_checklist_run_item(
    run_id: uuid.UUID,
    item_id: uuid.UUID,
    item_update: ChecklistRunItemUpdate,
    current_user=Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_item = db.query(ChecklistRunItem).filter(
        ChecklistRunItem.id == item_id, 
        ChecklistRunItem.run_id == run_id, 
        ChecklistRunItem.tenant_id == current_tenant.id
    ).first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Checklist Run Item not found")
    
    update_data = item_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
