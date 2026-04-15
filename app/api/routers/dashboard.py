from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import SessionLocal
from app.db.models import Asset, Tenant, Mission, MissionAnomaly
from app.api.routers.auth import get_db
from app.core.tenancy import get_tenant

router = APIRouter()

@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # Total Assets
    total_assets = db.query(func.count(Asset.id)).filter(Asset.tenant_id == current_tenant.id).scalar() or 0
    
    # Active Missions / Interventions
    active_missions = db.query(func.count(Mission.id)).filter(
        Mission.tenant_id == current_tenant.id,
        Mission.status.in_(["IN_PROGRESS", "PLANNED"])
    ).scalar() or 0
    
    # Completed Missions
    completed_missions = db.query(func.count(Mission.id)).filter(
        Mission.tenant_id == current_tenant.id,
        Mission.status == "COMPLETED"
    ).scalar() or 0
    
    # Open Anomalies
    open_anomalies = db.query(func.count(MissionAnomaly.id)).filter(
        MissionAnomaly.tenant_id == current_tenant.id,
        MissionAnomaly.status == "OPEN"
    ).scalar() or 0

    return {
        "totalAssets": total_assets,
        "activeMissions": active_missions,
        "completedMissions": completed_missions,
        "openAnomalies": open_anomalies,
        "complianceScore": 85 if total_assets > 0 else 100, # Mocked calculation for demonstration
    }
