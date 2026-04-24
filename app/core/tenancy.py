from typing import Generator
import uuid

from fastapi import Depends, HTTPException, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Tenant

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.execute(text("RESET app.current_tenant"))
        except Exception:
            pass
        db.close()

def get_tenant(
    x_tenant_id: str = Header(..., description="Tenant ID UUID"),
    db: Session = Depends(get_db)
) -> Tenant:
    """
    Dependency to get the current tenant from the X-Tenant-ID header.
    In a real app, this would be derived from the JWT token or subdomain.
    For MVP, we enforce it via header or token claims.
    """
    try:
        tenant_uuid = uuid.UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-Tenant-ID header format")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    try:
        # Use a parameterized session-level setting so it survives commits and rollbacks safely.
        db.execute(
            text("SELECT set_config('app.current_tenant', :tenant_id, false)"),
            {"tenant_id": str(tenant.id)},
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to set tenant context")

    return tenant
