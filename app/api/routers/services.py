from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import ServiceType, ChecklistTemplate, ChecklistItem, Tenant
from app.schemas.services import (
    ServiceTypeResponse, ServiceTypeCreate,
    ChecklistTemplateResponse, ChecklistTemplateCreate, ChecklistItemCreate
)
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

# --- Service Types ---
@router.get("/service-types", response_model=List[ServiceTypeResponse])
def read_service_types(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    return db.query(ServiceType).filter(ServiceType.tenant_id == current_tenant.id).offset(skip).limit(limit).all()

@router.post("/service-types", response_model=ServiceTypeResponse)
def create_service_type(
    service_type: ServiceTypeCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_obj = ServiceType(**service_type.dict(), tenant_id=current_tenant.id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# --- Checklist Templates ---
@router.get("/checklist-templates", response_model=List[ChecklistTemplateResponse])
def read_checklist_templates(
    service_type_id: uuid.UUID = None,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(ChecklistTemplate).filter(ChecklistTemplate.tenant_id == current_tenant.id)
    if service_type_id:
        query = query.filter(ChecklistTemplate.service_type_id == service_type_id)
    return query.all()

@router.post("/checklist-templates", response_model=ChecklistTemplateResponse)
def create_checklist_template(
    template: ChecklistTemplateCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # create template
    db_template = ChecklistTemplate(
        service_type_id=template.service_type_id,
        version=template.version,
        title=template.title,
        description=template.description,
        is_active=template.is_active,
        tenant_id=current_tenant.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    # create items
    if template.items:
        items = []
        for item_in in template.items:
            item = ChecklistItem(
                **item_in.dict(),
                template_id=db_template.id,
                tenant_id=current_tenant.id
            )
            items.append(item)
        db.add_all(items)
        db.commit()
        db.refresh(db_template) # refresh to load relationship
        
    return db_template

@router.get("/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
def read_checklist_template(
    template_id: uuid.UUID,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.tenant_id == current_tenant.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
