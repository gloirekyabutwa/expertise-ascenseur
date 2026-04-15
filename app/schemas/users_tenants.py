from typing import Optional
import uuid
from pydantic import BaseModel, EmailStr

# Tenant Schemas
class TenantBase(BaseModel):
    name: str
    slug: str

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    siret: Optional[str] = None
    capital: Optional[str] = None
    vat_id: Optional[str] = None
    branding_logo_url: Optional[str] = None
    agencies: Optional[str] = None
    settings_json: Optional[dict] = None

class TenantResponse(TenantBase):
    id: uuid.UUID
    
    address: Optional[str] = None
    region: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    siret: Optional[str] = None
    capital: Optional[str] = None
    vat_id: Optional[str] = None
    branding_logo_url: Optional[str] = None
    agencies: Optional[str] = None

    settings_json: Optional[dict] = None
    
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "VIEWER"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    
    class Config:
        from_attributes = True
