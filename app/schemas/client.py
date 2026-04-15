from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class ClientBase(BaseModel):
    name: str 
    client_type: str = "SYNDIC"
    
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "France"
    
    phone: Optional[str] = None
    email: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    name: Optional[str] = None
    client_type: Optional[str] = None

class ClientResponse(ClientBase):
    id: UUID
    tenant_id: UUID

    class Config:
        from_attributes = True
