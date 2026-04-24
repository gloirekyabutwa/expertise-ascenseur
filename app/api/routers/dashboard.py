from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_active_user
from app.db.models import Asset, Tenant, Mission, MissionAnomaly
from app.api.routers.auth import get_db
from app.core.tenancy import get_tenant

router = APIRouter()

@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    current_user=Depends(get_current_active_user),
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    # Total Assets
    total_assets = db.query(func.count(Asset.id)).filter(Asset.tenant_id == current_tenant.id).scalar() or 0
    
    # Active Missions
    active_missions = db.query(func.count(Mission.id)).filter(
        Mission.tenant_id == current_tenant.id,
        Mission.status.in_(["IN_PROGRESS", "PLANNED"])
    ).scalar() or 0
    
    # Open Anomalies
    open_anomalies = db.query(func.count(MissionAnomaly.id)).filter(
        MissionAnomaly.tenant_id == current_tenant.id,
        MissionAnomaly.status == "OPEN"
    ).scalar() or 0

    # Assets by Type
    assets_by_type = db.query(Asset.device_type, func.count(Asset.id)).filter(
        Asset.tenant_id == current_tenant.id
    ).group_by(Asset.device_type).all()
    
    # Compliance Score (Assets with no open anomalies / total assets)
    assets_with_open_anomalies = db.query(Asset.id).join(Mission).join(MissionAnomaly).filter(
        Asset.tenant_id == current_tenant.id,
        MissionAnomaly.status == "OPEN"
    ).distinct().count()
    
    compliance_score = 100
    if total_assets > 0:
        # Simple ratio for now
        compliant_assets = max(0, total_assets - assets_with_open_anomalies)
        compliance_score = int((compliant_assets / total_assets) * 100)

    # Top 5 Sites with most open anomalies
    from app.db.models.tenants_and_assets import Site
    anomalies_by_site = db.query(Site.name, func.count(MissionAnomaly.id).label('count'))\
        .join(Mission, Site.id == Mission.site_id)\
        .join(MissionAnomaly, Mission.id == MissionAnomaly.mission_id)\
        .filter(Site.tenant_id == current_tenant.id, MissionAnomaly.status == "OPEN")\
        .group_by(Site.name)\
        .order_by(func.count(MissionAnomaly.id).desc())\
        .limit(5).all()

    # Anomalies by Severity (Join with Catalog)
    from app.db.models.checklist import AnomalyCatalog
    anomalies_by_severity = db.query(AnomalyCatalog.criticality, func.count(MissionAnomaly.id))\
        .join(AnomalyCatalog, MissionAnomaly.catalog_anomaly_id == AnomalyCatalog.id)\
        .filter(MissionAnomaly.tenant_id == current_tenant.id, MissionAnomaly.status == "OPEN")\
        .group_by(AnomalyCatalog.criticality).all()

    # Missions by month (last 6 months)
    missions_by_month = db.query(
        func.to_char(Mission.scheduled_start, 'YYYY-MM').label('month'),
        func.count(Mission.id)
    ).filter(
        Mission.tenant_id == current_tenant.id,
        Mission.scheduled_start != None
    ).group_by('month').order_by('month').limit(6).all()

    return {
        "stats": {
            "totalAssets": total_assets,
            "activeMissions": active_missions,
            "openAnomalies": open_anomalies,
            "complianceScore": compliance_score
        },
        "charts": {
            "assetsByType": [{"type": t or "Inconnu", "count": c} for t, c in assets_by_type],
            "anomaliesBySeverity": [{"severity": s or "MEDIUM", "count": c} for s, c in anomalies_by_severity],
            "missionsByMonth": [{"month": m, "count": c} for m, c in missions_by_month],
            "anomaliesBySite": [{"site": a[0], "count": a[1]} for a in anomalies_by_site]
        }
    }
