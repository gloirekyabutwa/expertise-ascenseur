from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.api.routers.auth import get_db
from app.core.tenancy import get_tenant
from app.db.models import Tenant, Mission
from app.db.models.checklist import (
    ChecklistCatalog, MissionChecklistResult, AnomalyCatalog, MissionAnomaly
)
from app.schemas.checklist import (
    ChecklistCatalogResponse, AnomalyCatalogResponse,
    MissionChecklistResultCreate, MissionChecklistResultUpdate, MissionChecklistResultResponse,
    MissionAnomalyCreate, MissionAnomalyUpdate, MissionAnomalyResponse
)

router = APIRouter()

# --- Catalog ---

@router.get("/checklist/catalog", response_model=List[ChecklistCatalogResponse])
def get_checklist_catalog(
    db: Session = Depends(get_db),
    _: deps.User = Depends(deps.get_current_active_user)
):
    # Catalog is global (no tenant filter usually, unless custom items)
    # Our model doesn't have TenantMixin for Catalog
    return db.query(ChecklistCatalog).order_by(ChecklistCatalog.order_index).all()

@router.get("/checklist/anomalies/catalog", response_model=List[AnomalyCatalogResponse])
def get_anomaly_catalog(
    db: Session = Depends(get_db),
    _: deps.User = Depends(deps.get_current_active_user)
):
    return db.query(AnomalyCatalog).all()

# --- Checklist Results ---

@router.get("/missions/{mission_id}/checklist", response_model=List[MissionChecklistResultResponse])
def get_mission_checklist(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.get_current_active_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    return db.query(MissionChecklistResult).filter(MissionChecklistResult.mission_id == mission_id).all()

@router.post("/missions/{mission_id}/checklist")
def update_mission_checklist(
    mission_id: uuid.UUID,
    results: List[MissionChecklistResultCreate],
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Upsert logic:
    # We could iterate and update if exists, or delete all and insert (risky if huge, but here ~100 items).
    # Upsert is safer to preserve IDs if we had them, but Create schema doesn't have IDs.
    # Frontend sends state.
    # Let's use "Delete + Insert" for MVP simplicity, consistent with compliance lists.
    # OR better: Check existence by (mission_id, catalog_item_id)
    
    for res_in in results:
        existing = db.query(MissionChecklistResult).filter(
            MissionChecklistResult.mission_id == mission_id,
            MissionChecklistResult.catalog_item_id == res_in.catalog_item_id
        ).first()
        
        if existing:
            # Only update fields that were explicitly provided (not None)
            update_data = res_in.dict(exclude_unset=True)
            for key, value in update_data.items():
                if key != "catalog_item_id" and value is not None:
                    setattr(existing, key, value)
        else:
            new_res = MissionChecklistResult(
                mission_id=mission_id,
                tenant_id=current_tenant.id,
                catalog_item_id=res_in.catalog_item_id,
                status=res_in.status or "NOT_CHECKED",
                investigation_nature=res_in.investigation_nature,
                result_value=res_in.result_value,
                observation_code=res_in.observation_code,
                comment=res_in.comment,
            )
            db.add(new_res)
            
    db.commit()
    return {"status": "ok", "count": len(results)}

# --- Anomalies ---

@router.get("/missions/{mission_id}/anomalies", response_model=List[MissionAnomalyResponse])
def get_mission_anomalies(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.get_current_active_user)
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    return db.query(MissionAnomaly).options(joinedload(MissionAnomaly.catalog_anomaly)).filter(MissionAnomaly.mission_id == mission_id).all()

@router.post("/missions/{mission_id}/anomalies", response_model=MissionAnomalyResponse)
def create_mission_anomaly(
    mission_id: uuid.UUID,
    anomaly_in: MissionAnomalyCreate,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    db_anomaly = MissionAnomaly(
        mission_id=mission_id,
        tenant_id=current_tenant.id,
        **anomaly_in.dict()
    )
    db.add(db_anomaly)
    
    # Logic: If linked to a checklist item, update the checklist result automatically
    if anomaly_in.catalog_item_id:
        # Determine the observation code to display in the checklist
        # Prioritize catalog code, then custom code
        obs_code = anomaly_in.custom_code
        if anomaly_in.catalog_anomaly_id:
            cat_anom = db.query(AnomalyCatalog).get(anomaly_in.catalog_anomaly_id)
            if cat_anom:
                obs_code = cat_anom.code
        
        existing_res = db.query(MissionChecklistResult).filter(
            MissionChecklistResult.mission_id == mission_id,
            MissionChecklistResult.catalog_item_id == anomaly_in.catalog_item_id
        ).first()
        
        if existing_res:
            existing_res.observation_code = obs_code
            existing_res.status = "CONCERNED" # It's checked and has an anomaly
            # Note: We don't overwrite the comment unless needed, but obs_code is primary linkage
            
    db.commit()
    db.refresh(db_anomaly)
    return db_anomaly

@router.put("/missions/{mission_id}/anomalies/{anomaly_id}", response_model=MissionAnomalyResponse)
def update_mission_anomaly(
    mission_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    anomaly_in: MissionAnomalyUpdate,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    db_anomaly = db.query(MissionAnomaly).filter(MissionAnomaly.id == anomaly_id, MissionAnomaly.mission_id == mission_id).first()
    if not db_anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    update_data = anomaly_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_anomaly, key, value)
        
    db.commit()
    db.refresh(db_anomaly)
    return db_anomaly

@router.delete("/missions/{mission_id}/anomalies/{anomaly_id}")
def delete_mission_anomaly(
    mission_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    db_anomaly = db.query(MissionAnomaly).filter(MissionAnomaly.id == anomaly_id, MissionAnomaly.mission_id == mission_id).first()
    if not db_anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    db.delete(db_anomaly)
    db.commit()
    return {"status": "deleted"}
