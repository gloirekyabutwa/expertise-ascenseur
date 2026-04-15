from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Site, Tenant
from app.schemas.assets import SiteCreate, SiteResponse, SiteUpdate
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

@router.get("/", response_model=List[SiteResponse])
def read_sites(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    sites = db.query(Site).filter(Site.tenant_id == current_tenant.id).offset(skip).limit(limit).all()
    return sites

@router.post("/", response_model=SiteResponse)
def create_site(
    site: SiteCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_site = Site(**site.dict(), tenant_id=current_tenant.id)
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site

@router.get("/{site_id}", response_model=SiteResponse)
def read_site(
    site_id: uuid.UUID,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == current_tenant.id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: uuid.UUID,
    site_update: SiteUpdate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == current_tenant.id).first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    update_data = site_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_site, key, value)
    
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site
