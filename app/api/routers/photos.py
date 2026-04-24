import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.db.models import Mission, MissionAnomaly, MissionChecklistResult
from app.db.models.tenants_and_assets import User
from app.db.models.documents import MissionPhoto
from app.schemas.photos import MissionPhotoResponse, MissionPhotoUpdate
from app.services.storage.minio_storage import storage

router = APIRouter()

@router.post("/missions/{mission_id}/photos", response_model=MissionPhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_mission_photo(
    mission_id: uuid.UUID,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    checklist_result_id: Optional[uuid.UUID] = Form(None),
    anomaly_id: Optional[uuid.UUID] = Form(None),
    captured_at: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.tenant_id == current_user.tenant_id,
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    if checklist_result_id:
        checklist_result = db.query(MissionChecklistResult).filter(
            MissionChecklistResult.id == checklist_result_id,
            MissionChecklistResult.mission_id == mission_id,
            MissionChecklistResult.tenant_id == current_user.tenant_id,
        ).first()
        if not checklist_result:
            raise HTTPException(status_code=400, detail="Checklist result not found for this mission")

    if anomaly_id:
        anomaly = db.query(MissionAnomaly).filter(
            MissionAnomaly.id == anomaly_id,
            MissionAnomaly.mission_id == mission_id,
            MissionAnomaly.tenant_id == current_user.tenant_id,
        ).first()
        if not anomaly:
            raise HTTPException(status_code=400, detail="Anomaly not found for this mission")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    size = len(content)
    safe_filename = os.path.basename(file.filename or f"photo-{uuid.uuid4()}.bin")
    ext = safe_filename.rsplit(".", 1)[-1] if "." in safe_filename else "bin"
    object_key = f"missions/{mission_id}/photos/{uuid.uuid4()}.{ext}"

    try:
        storage.upload_file_object(object_key, content, file.content_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")

    photo = MissionPhoto(
        tenant_id=current_user.tenant_id,
        mission_id=mission_id,
        object_key=object_key,
        filename=safe_filename,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=size,
        description=description,
        checklist_result_id=checklist_result_id,
        anomaly_id=anomaly_id,
        captured_at=captured_at,
        latitude=latitude,
        longitude=longitude
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)

    response = MissionPhotoResponse.model_validate(photo)
    response.url = storage.get_presigned_url(object_key, expires=3600)
    return response

@router.get("/missions/{mission_id}/photos", response_model=List[MissionPhotoResponse])
def list_mission_photos(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN", "VIEWER"]))
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.tenant_id == current_user.tenant_id,
    ).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    photos = db.query(MissionPhoto).filter(
        MissionPhoto.mission_id == mission_id,
        MissionPhoto.tenant_id == current_user.tenant_id,
    ).all()

    results = []
    for photo in photos:
        p_resp = MissionPhotoResponse.model_validate(photo)
        try:
            p_resp.url = storage.get_presigned_url(photo.object_key, expires=3600)
        except Exception:
            p_resp.url = None
        results.append(p_resp)

    return results

@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    photo = db.query(MissionPhoto).filter(
        MissionPhoto.id == photo_id,
        MissionPhoto.tenant_id == current_user.tenant_id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    try:
        storage.delete_file(photo.object_key)
    except Exception:
        pass

    db.delete(photo)
    db.commit()

@router.patch("/photos/{photo_id}", response_model=MissionPhotoResponse)
def update_photo_metadata(
    photo_id: uuid.UUID,
    photo_in: MissionPhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "TECHNICIAN"]))
):
    photo = db.query(MissionPhoto).filter(
        MissionPhoto.id == photo_id,
        MissionPhoto.tenant_id == current_user.tenant_id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if photo_in.checklist_result_id:
        checklist_result = db.query(MissionChecklistResult).filter(
            MissionChecklistResult.id == photo_in.checklist_result_id,
            MissionChecklistResult.mission_id == photo.mission_id,
            MissionChecklistResult.tenant_id == current_user.tenant_id,
        ).first()
        if not checklist_result:
            raise HTTPException(status_code=400, detail="Checklist result not found for this mission")

    if photo_in.anomaly_id:
        anomaly = db.query(MissionAnomaly).filter(
            MissionAnomaly.id == photo_in.anomaly_id,
            MissionAnomaly.mission_id == photo.mission_id,
            MissionAnomaly.tenant_id == current_user.tenant_id,
        ).first()
        if not anomaly:
            raise HTTPException(status_code=400, detail="Anomaly not found for this mission")

    update_data = photo_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(photo, key, value)

    db.commit()
    db.refresh(photo)

    response = MissionPhotoResponse.model_validate(photo)
    response.url = storage.get_presigned_url(photo.object_key, expires=3600)
    return response
