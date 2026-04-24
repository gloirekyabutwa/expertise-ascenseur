from typing import Optional, List
import uuid
from datetime import date
from pydantic import BaseModel

# Site Schemas
class SiteBase(BaseModel):
    name: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: Optional[str] = None

from app.schemas.client import ClientResponse

class SiteCreate(SiteBase):
    client_id: Optional[uuid.UUID] = None

class SiteUpdate(SiteBase):
    client_id: Optional[uuid.UUID] = None

class SiteResponse(SiteBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    client_id: Optional[uuid.UUID] = None
    client: Optional[ClientResponse] = None
    
    class Config:
        from_attributes = True

# Asset Schemas
class AssetBase(BaseModel):
    label: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    commissioning_date: Optional[date] = None
    notes: Optional[str] = None
    
    # Technical Specs
    installation_number: Optional[str] = None
    year_commissioned: Optional[int] = None
    device_type: Optional[str] = None
    feature_type: Optional[str] = None
    usage_type: Optional[str] = None
    load_capacity: Optional[int] = None
    max_passengers: Optional[int] = None
    nominal_speed: Optional[str] = None
    number_of_levels: Optional[int] = None
    machinery_location: Optional[str] = None
    maintainer_name: Optional[str] = None
    maintainer_contract_ref: Optional[str] = None

class AssetCreate(AssetBase):
    site_id: uuid.UUID

class AssetUpdate(AssetBase):
    site_id: Optional[uuid.UUID] = None

# Technical Characteristics Schema
class AssetTechnicalCharacteristicsResponse(BaseModel):
    year_commissioned: Optional[int] = None
    load_capacity_kg: Optional[int] = None
    persons_capacity: Optional[int] = None
    nominal_speed_ms: Optional[str] = None
    travel_height_m: Optional[str] = None
    stops_count: Optional[int] = None
    machinery_type: Optional[str] = None
    machinery_location: Optional[str] = None
    controller_type: Optional[str] = None
    door_type: Optional[str] = None
    safety_gear_type: Optional[str] = None
    last_major_renovation_date: Optional[date] = None
    maintenance_contract_ref: Optional[str] = None

    class Config:
        from_attributes = True

class AssetResponse(AssetBase):
    id: uuid.UUID
    site_id: uuid.UUID
    tenant_id: uuid.UUID
    technical_characteristics: Optional[AssetTechnicalCharacteristicsResponse] = None
    
    class Config:
        from_attributes = True
