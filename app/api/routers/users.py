from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import User, Tenant
from app.schemas.users_tenants import UserCreate, UserResponse, UserUpdate
from app.core import security
from app.core.tenancy import get_tenant
from app.api.routers.auth import get_db

router = APIRouter()

from app.api.deps import get_current_active_user

@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user.
    """
    return current_user

@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(User.tenant_id == current_tenant.id).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.email == user.email, User.tenant_id == current_tenant.id).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered in this tenant")
    
    hashed_password = security.get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role,
        tenant_id=current_tenant.id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: uuid.UUID,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_tenant.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
