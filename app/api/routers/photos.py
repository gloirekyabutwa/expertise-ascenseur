import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db.models.tenants_and_assets import User
from app.db.models.documents import MissionPhoto
from app.schemas.photos import MissionPhotoResponse, MissionPhotoUpdate
from app.services.storage.minio_storage import storage
# fallback is content_type from UploadFile

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
    current_user: User = Depends(get_current_user)
):
    """
    Upload a photo and associate it with a mission. Optionally link to checklist item or anomaly.
    """
    # Verify mission exists/tenant access (RLS handles tenant, but good to check mission_id logic)
    
    # 1. Read file and push to MinIO
    content = await file.read()
    size = len(content)
    
    # Generate unique key
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    object_key = f"missions/{mission_id}/photos/{uuid.uuid4()}.{ext}"
    
    try:
        storage.upload_file_object(object_key, content, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")

    # 2. Save DB record
    photo = MissionPhoto(
        tenant_id=current_user.tenant_id,
        mission_id=mission_id,
        object_key=object_key,
        filename=file.filename,
        mime_type=file.content_type,
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
    
    # Generate URL for immediate view
    response = MissionPhotoResponse.model_validate(photo)
    response.url = storage.get_presigned_url(object_key, expires=3600)
    
    return response

@router.get("/missions/{mission_id}/photos", response_model=List[MissionPhotoResponse])
def list_mission_photos(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photos = db.query(MissionPhoto).filter(MissionPhoto.mission_id == mission_id).all()
    
    # Generate presigned URLs
    results = []
    for photo in photos:
        p_resp = MissionPhotoResponse.model_validate(photo)
        try:
            p_resp.url = storage.get_presigned_url(photo.object_key, expires=3600)
        except:
            p_resp.url = None
        results.append(p_resp)
        
    return results

@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = db.query(MissionPhoto).filter(MissionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    try:
        storage.delete_file(photo.object_key)
    except:
        pass # If missing in MinIO, just remove DB entry
        
    db.delete(photo)
    db.commit()
    
@router.patch("/photos/{photo_id}", response_model=MissionPhotoResponse)
def update_photo_metadata(
    photo_id: uuid.UUID,
    photo_in: MissionPhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = db.query(MissionPhoto).filter(MissionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    update_data = photo_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(photo, key, value)
        
    db.commit()
    db.refresh(photo)
    
    response = MissionPhotoResponse.model_validate(photo)
    response.url = storage.get_presigned_url(photo.object_key, expires=3600)
    return response
