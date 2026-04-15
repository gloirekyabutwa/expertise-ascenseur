from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Mission, Tenant, ServiceType, Site, Asset, User
from app.schemas.missions import MissionCreate, MissionResponse, MissionUpdate
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

from app.api import deps

# ... imports ...

@router.get("/", response_model=List[MissionResponse])
def read_missions(
    status: Optional[str] = None,
    site_id: Optional[uuid.UUID] = None,
    asset_id: Optional[uuid.UUID] = None,
    assignee_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user), # Implicitly depends on tenant
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(Mission).filter(Mission.tenant_id == current_tenant.id)
    
    if status:
        query = query.filter(Mission.status == status)
    if site_id:
        query = query.filter(Mission.site_id == site_id)
    if asset_id:
        query = query.filter(Mission.asset_id == asset_id)
    if assignee_id:
        query = query.filter(Mission.assignee_user_id == assignee_id)
        
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=MissionResponse)
def create_mission(
    mission: MissionCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
    _: User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    # Validations
    if mission.asset_id:
        asset = db.query(Asset).filter(Asset.id == mission.asset_id, Asset.tenant_id == current_tenant.id).first()
        if not asset:
            raise HTTPException(status_code=400, detail="Asset not found")
            
    if mission.site_id:
        site = db.query(Site).filter(Site.id == mission.site_id, Site.tenant_id == current_tenant.id).first()
        if not site:
             raise HTTPException(status_code=400, detail="Site not found")
             
    if mission.assignee_user_id:
         user = db.query(User).filter(User.id == mission.assignee_user_id, User.tenant_id == current_tenant.id).first()
         if not user:
             raise HTTPException(status_code=400, detail="Assignee not found")

    db_mission = Mission(**mission.dict(), tenant_id=current_tenant.id)
    db.add(db_mission)
    db.commit()
    db.refresh(db_mission)
    return db_mission

@router.get("/{mission_id}", response_model=MissionResponse)
def read_mission(
    mission_id: uuid.UUID,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission

@router.patch("/{mission_id}", response_model=MissionResponse)
def update_mission(
    mission_id: uuid.UUID,
    mission_update: MissionUpdate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
    _: User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    db_mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not db_mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    update_data = mission_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_mission, key, value)
    
    db.add(db_mission)
    db.commit()
    db.refresh(db_mission)
    return db_mission
