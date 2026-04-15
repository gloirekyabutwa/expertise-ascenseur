from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.api import deps
from app.api.routers.auth import get_db
from app.core.tenancy import get_tenant
from app.db.models import Tenant, Mission
from app.db.models.compliance import (
    MissionAttendee, MissionDocumentProvided, MissionPreviousControl, MissionWorkItem
)
from app.schemas.compliance import (
    MissionComplianceUpdate,
    MissionAttendeeResponse, MissionAttendeeCreate,
    MissionDocumentProvidedResponse, MissionDocumentProvidedCreate,
    MissionPreviousControlResponse, MissionPreviousControlCreate,
    MissionWorkItemResponse, MissionWorkItemCreate,
    MissionComplianceBundle
)
from app.db.models.checklist import MissionChecklistResult, MissionAnomaly

router = APIRouter()

@router.get("/missions/{mission_id}/compliance-bundle", response_model=MissionComplianceBundle)
def get_mission_compliance_bundle(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.get_current_active_user)
):
    # Verify mission exists
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Fetch all lists
    attendees = db.query(MissionAttendee).filter(MissionAttendee.mission_id == mission_id).all()
    documents = db.query(MissionDocumentProvided).filter(MissionDocumentProvided.mission_id == mission_id).all()
    previous_controls = db.query(MissionPreviousControl).filter(MissionPreviousControl.mission_id == mission_id).all()
    work_items = db.query(MissionWorkItem).filter(MissionWorkItem.mission_id == mission_id).all()
    
    # Fetch Checklist & Anomalies
    checklist_results = db.query(MissionChecklistResult).filter(MissionChecklistResult.mission_id == mission_id).all()
    anomalies = db.query(MissionAnomaly).filter(MissionAnomaly.mission_id == mission_id).all()

    return {
        "attendees": attendees,
        "documents": documents,
        "previous_controls": previous_controls,
        "work_items": work_items,
        "checklist_results": checklist_results,
        "anomalies": anomalies
    }

@router.get("/missions/{mission_id}/compliance")
def get_mission_compliance(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.get_current_active_user)
):
    # Verify mission exists and belongs to tenant
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Fetch all lists
    attendees = db.query(MissionAttendee).filter(MissionAttendee.mission_id == mission_id).all()
    documents = db.query(MissionDocumentProvided).filter(MissionDocumentProvided.mission_id == mission_id).all()
    previous_controls = db.query(MissionPreviousControl).filter(MissionPreviousControl.mission_id == mission_id).all()
    work_items = db.query(MissionWorkItem).filter(MissionWorkItem.mission_id == mission_id).all()

    return {
        "attendees": attendees,
        "documents": documents,
        "previous_controls": previous_controls,
        "work_items": work_items
    }

@router.put("/missions/{mission_id}/compliance")
def update_mission_compliance(
    mission_id: uuid.UUID,
    payload: MissionComplianceUpdate,
    db: Session = Depends(get_db),
    current_tenant: Tenant = Depends(get_tenant),
    _: deps.User = Depends(deps.RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    # Verify mission
    mission = db.query(Mission).filter(Mission.id == mission_id, Mission.tenant_id == current_tenant.id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Helper update strategies: For simple lists, "Delete All + Insert All" is easiest but destroys IDs.
    # A better approach for MVP:
    # - If list is provided, delete existing and recreate.
    # - If list is None, ignore.
    
    # 1. Attendees
    if payload.attendees is not None:
        db.query(MissionAttendee).filter(MissionAttendee.mission_id == mission_id).delete()
        for item in payload.attendees:
            db_item = MissionAttendee(**item.dict(), mission_id=mission_id, tenant_id=current_tenant.id)
            db.add(db_item)
            
    # 2. Documents
    if payload.documents is not None:
        db.query(MissionDocumentProvided).filter(MissionDocumentProvided.mission_id == mission_id).delete()
        for item in payload.documents:
            db_item = MissionDocumentProvided(**item.dict(), mission_id=mission_id, tenant_id=current_tenant.id)
            db.add(db_item)
            
    # 3. Previous Controls
    if payload.previous_controls is not None:
        db.query(MissionPreviousControl).filter(MissionPreviousControl.mission_id == mission_id).delete()
        for item in payload.previous_controls:
            db_item = MissionPreviousControl(**item.dict(), mission_id=mission_id, tenant_id=current_tenant.id)
            db.add(db_item)
            
    # 4. Work Items
    if payload.work_items is not None:
        db.query(MissionWorkItem).filter(MissionWorkItem.mission_id == mission_id).delete()
        for item in payload.work_items:
            db_item = MissionWorkItem(**item.dict(), mission_id=mission_id, tenant_id=current_tenant.id)
            db.add(db_item)

    db.commit()
    
    return get_mission_compliance(mission_id, db=db, current_tenant=current_tenant, _=None)
