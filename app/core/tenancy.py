from typing import Generator, Optional
import uuid

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import Tenant

def get_db() -> Generator:
    from sqlalchemy import text
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
    if not x_tenant_id:
         # For login, we might not have a tenant yet if we are logging in as superadmin or just checking existence
         # BUT, our logic requires tenant for user lookup.
         # Let's see if we can relax this or if client MUST send it.
         return None
    
    try:
        tenant_uuid = uuid.UUID(x_tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid X-Tenant-ID header format")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Set the tenant context for RLS
    from sqlalchemy import text
    try:
        # Use session-level setting (not LOCAL) so it persists across commits within request
        db.execute(text(f"SET app.current_tenant = '{tenant.id}'"))
    except Exception as e:
        # Fallback or error handling if needed
        # For now, just logging or re-raising might be appropriate
        print(f"Failed to set tenant context: {e}")
        raise HTTPException(status_code=500, detail="Failed to set tenant context")

    return tenant
