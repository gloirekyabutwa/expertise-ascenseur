from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models.client import Client
from app.db.models.tenants_and_assets import Tenant
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.core.tenancy import get_tenant
from app.api.deps import get_db

router = APIRouter()

@router.get("/", response_model=List[ClientResponse])
def read_clients(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    return db.query(Client).filter(Client.tenant_id == current_tenant.id).offset(skip).limit(limit).all()

@router.post("/", response_model=ClientResponse)
def create_client(
    client: ClientCreate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_client = Client(**client.dict(), tenant_id=current_tenant.id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/{client_id}", response_model=ClientResponse)
def read_client(
    client_id: uuid.UUID,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id, Client.tenant_id == current_tenant.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: uuid.UUID,
    client_update: ClientUpdate,
    current_tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db)
):
    db_client = db.query(Client).filter(Client.id == client_id, Client.tenant_id == current_tenant.id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    update_data = client_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
        
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client
