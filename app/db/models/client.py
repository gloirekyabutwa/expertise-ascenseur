from typing import Optional
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin

class Client(Base, TenantMixin):
    __tablename__ = "clients"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Type: SYNDIC, PROPRIETAIRE, etc.
    client_type: Mapped[str] = mapped_column(String(50), default="SYNDIC")
    legal_form: Mapped[Optional[str]] = mapped_column(String(50)) # e.g. "Syndic Bénévole", "SARL"
    
    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(String(255))
    address_line2: Mapped[Optional[str]] = mapped_column(String(255))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[Optional[str]] = mapped_column(String(100), default="France")
    
    # Contact
    contact_name: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Relationships
    sites: Mapped[list["Site"]] = relationship("Site", back_populates="client")
