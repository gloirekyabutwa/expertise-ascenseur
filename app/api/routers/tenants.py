import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_active_user
from app.db.models import Tenant, User
from app.schemas.users_tenants import TenantCreate, TenantResponse, TenantUpdate
from app.api.routers.auth import get_db

router = APIRouter()

@router.post("/", response_model=TenantResponse)
def create_tenant(
    tenant: TenantCreate,
    current_user: User = Depends(RoleChecker(["ADMIN"])),
):
    raise HTTPException(
        status_code=403,
        detail="Tenant provisioning is disabled from the public API",
    )

@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: uuid.UUID,
    tenant_update: TenantUpdate,
    current_user: User = Depends(RoleChecker(["ADMIN"])),
    db: Session = Depends(get_db),
):
    if tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Tenant not found")

    db_tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = tenant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tenant, key, value)
    
    db.commit()
    db.refresh(db_tenant)
    return db_tenant
