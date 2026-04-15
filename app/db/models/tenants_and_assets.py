from typing import Optional
from datetime import date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Date, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base, TenantMixin

class Tenant(Base):
    __tablename__ = "tenants"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    
    # Legal & Branding
    address: Mapped[Optional[str]] = mapped_column(String(255))
    region: Mapped[Optional[str]] = mapped_column(String(100))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    fax: Mapped[Optional[str]] = mapped_column(String(50))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    
    siret: Mapped[Optional[str]] = mapped_column(String(50))
    capital: Mapped[Optional[str]] = mapped_column(String(50))
    vat_id: Mapped[Optional[str]] = mapped_column(String(50)) # TVA Intra
    
    branding_logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    agencies: Mapped[Optional[str]] = mapped_column(String(500)) # e.g. "Bordeaux - Paris..."
    
    ape_code: Mapped[Optional[str]] = mapped_column(String(20))
    legal_mentions: Mapped[Optional[str]] = mapped_column(Text) # Free text for footer

    settings_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    agencies_list: Mapped[list["TenantAgency"]] = relationship("TenantAgency", back_populates="tenant")


class User(Base, TenantMixin):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(255), nullable=False) 
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="VIEWER")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Future SSO fields
    idp: Mapped[Optional[str]] = mapped_column(String(50))
    external_subject: Mapped[Optional[str]] = mapped_column(String(255))
    sso_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")


class Site(Base, TenantMixin):
    __tablename__ = "sites"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    country_code: Mapped[Optional[str]] = mapped_column(String(2))

    client_id: Mapped[Optional[UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    
    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="sites")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="site")



class Asset(Base, TenantMixin):
    __tablename__ = "assets"
    site_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Standard Fields
    serial_number: Mapped[Optional[str]] = mapped_column(String(255))
    model: Mapped[Optional[str]] = mapped_column(String(255))
    commissioning_date: Mapped[Optional[date]] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(String)

    # --- Technical Specs (Section 8) ---
    installation_number: Mapped[Optional[str]] = mapped_column(String(50))
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255))
    year_commissioned: Mapped[Optional[int]] = mapped_column(Integer) # Année mise en service
    
    device_type: Mapped[Optional[str]] = mapped_column(String(50)) # ASC, Monte-charge...
    feature_type: Mapped[Optional[str]] = mapped_column(String(50)) # Electrique, Hydraulique...
    
    usage_type: Mapped[Optional[str]] = mapped_column(String(50)) # Public, Privé...
    
    load_capacity: Mapped[Optional[int]] = mapped_column(Integer) # kg
    max_passengers: Mapped[Optional[int]] = mapped_column(Integer)
    
    nominal_speed: Mapped[Optional[float]] = mapped_column(String(50)) # Stored as string to allow "1.00 m/s" or float? Let's use string for flexibility in reports "1,00 m/s"
    
    number_of_levels: Mapped[Optional[int]] = mapped_column(Integer)
    
    machinery_location: Mapped[Optional[str]] = mapped_column(String(255)) # Haut, Bas, Local...
    
    maintainer_name: Mapped[Optional[str]] = mapped_column(String(255))
    maintainer_contract_ref: Mapped[Optional[str]] = mapped_column(String(100))

    site: Mapped["Site"] = relationship("Site", back_populates="assets")
    technical_characteristics: Mapped[Optional["AssetTechnicalCharacteristics"]] = relationship("AssetTechnicalCharacteristics", back_populates="asset", uselist=False)

class AssetTechnicalCharacteristics(Base, TenantMixin):
    __tablename__ = "asset_technical_characteristics"
    
    asset_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, unique=True)
    
    # Grid CTQ
    year_commissioned: Mapped[Optional[int]] = mapped_column(Integer)
    load_capacity_kg: Mapped[Optional[int]] = mapped_column(Integer)
    persons_capacity: Mapped[Optional[int]] = mapped_column(Integer)
    nominal_speed_ms: Mapped[Optional[str]] = mapped_column(String(50))
    travel_height_m: Mapped[Optional[float]] = mapped_column(String(50)) # Stored as string or float
    stops_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    machinery_type: Mapped[Optional[str]] = mapped_column(String(100)) # with/without room, hydraulic, traction
    machinery_location: Mapped[Optional[str]] = mapped_column(String(255))
    
    controller_type: Mapped[Optional[str]] = mapped_column(String(255))
    door_type: Mapped[Optional[str]] = mapped_column(String(255))
    safety_gear_type: Mapped[Optional[str]] = mapped_column(String(255))
    
    last_major_renovation_date: Mapped[Optional[date]] = mapped_column(Date)
    maintenance_contract_ref: Mapped[Optional[str]] = mapped_column(String(100))
    
    asset: Mapped["Asset"] = relationship("Asset", back_populates="technical_characteristics")
