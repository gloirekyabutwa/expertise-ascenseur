from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Tenant
from app.schemas.users_tenants import TenantCreate, TenantResponse, TenantUpdate
from app.api.routers.auth import get_db
# In a real app, only SuperAdmin should access this
# For MVP, we expose it but should protect it eventually

router = APIRouter()

@router.post("/", response_model=TenantResponse)
def create_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    db_tenant = db.query(Tenant).filter(Tenant.slug == tenant.slug).first()
    if db_tenant:
        raise HTTPException(status_code=400, detail="Tenant slug already in use")
    
    new_tenant = Tenant(name=tenant.name, slug=tenant.slug, settings_json={})
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(tenant_id: uuid.UUID, tenant_update: TenantUpdate, db: Session = Depends(get_db)):
    # In real app: check permission (user.tenant_id == tenant_id AND user.role == ADMIN)
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = tenant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tenant, key, value)
    
    db.commit()
    db.refresh(db_tenant)
    return db_tenant
