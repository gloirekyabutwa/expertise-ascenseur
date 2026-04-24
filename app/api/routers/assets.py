from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import RoleChecker, get_current_active_user
from app.db.models import Asset, Tenant, Site
from app.schemas.assets import AssetCreate, AssetResponse, AssetUpdate
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

@router.get("/", response_model=List[AssetResponse])
def read_assets(
    site_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(Asset).options(joinedload(Asset.technical_characteristics)).filter(Asset.tenant_id == current_tenant.id)
    if site_id:
        query = query.filter(Asset.site_id == site_id)
        
    assets = query.offset(skip).limit(limit).all()
    return assets

@router.post("/", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    current_user=Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # Verify site belongs to tenant
    site = db.query(Site).filter(Site.id == asset.site_id, Site.tenant_id == current_tenant.id).first()
    if not site:
        raise HTTPException(status_code=400, detail="Site not found or does not belong to this tenant")

    db_asset = Asset(**asset.dict(), tenant_id=current_tenant.id)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.get("/{asset_id}", response_model=AssetResponse)
def read_asset(
    asset_id: uuid.UUID,
    current_user=Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).options(joinedload(Asset.technical_characteristics)).filter(Asset.id == asset_id, Asset.tenant_id == current_tenant.id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: uuid.UUID,
    asset_update: AssetUpdate,
    current_user=Depends(RoleChecker(["ADMIN", "TECHNICIAN"])),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id == current_tenant.id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset_update.dict(exclude_unset=True)
    if "site_id" in update_data:
         site = db.query(Site).filter(Site.id == update_data["site_id"], Site.tenant_id == current_tenant.id).first()
         if not site:
            raise HTTPException(status_code=400, detail="Target Site not found or does not belong to this tenant")

    for key, value in update_data.items():
        setattr(db_asset, key, value)
    
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset
