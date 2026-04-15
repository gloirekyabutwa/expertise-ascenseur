from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.models import User, Tenant, ServiceType
from app.core import security
import uuid
import pytest

def test_rbac_missions(client: TestClient, db: Session, superuser_db: Session, tenant_header):
    # Setup: Ensure Tenant exists and get ID
    tenant_id = tenant_header["X-Tenant-ID"]
    
    # helper to create user
    def create_user_with_role(email, role):
        user = superuser_db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email, 
                password_hash=security.get_password_hash("password"),
                role=role,
                tenant_id=tenant_id
            )
            superuser_db.add(user)
            superuser_db.commit()
            superuser_db.refresh(user)
        else:
            # Update role if exists
            user.role = role
            superuser_db.commit()
            superuser_db.refresh(user)
        
        # Login to get token
        login_data = {"username": email, "password": "password"}
        r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data, headers=tenant_header)
        assert r.status_code == 200
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}", **tenant_header}, user

    # Create Users
    admin_headers, _ = create_user_with_role("admin-rbac@test.com", "ADMIN")
    tech_headers, _ = create_user_with_role("tech-rbac@test.com", "TECHNICIAN")
    viewer_headers, _ = create_user_with_role("viewer-rbac@test.com", "VIEWER")

    # Create Service Type for missions
    st = ServiceType(code=f"ST-RBAC-{uuid.uuid4().hex[:4]}", label="RBAC Service", tenant_id=tenant_id)
    superuser_db.add(st)
    superuser_db.commit()
    superuser_db.refresh(st)

    # 1. CREATE Mission
    mission_data = {
        "service_type_id": str(st.id),
        "status": "DRAFT",
        "metadata_json": {"desc": "RBAC Test"}
    }
    
    # Admin -> Should Succeed
    r = client.post(f"{settings.API_V1_STR}/missions/", json=mission_data, headers=admin_headers)
    assert r.status_code == 200
    m_id = r.json()["id"]

    # Tech -> Should Succeed
    r = client.post(f"{settings.API_V1_STR}/missions/", json=mission_data, headers=tech_headers)
    assert r.status_code == 200

    # Viewer -> Should Fail (403)
    r = client.post(f"{settings.API_V1_STR}/missions/", json=mission_data, headers=viewer_headers)
    assert r.status_code == 403

    # 2. UPDATE Mission
    update_data = {"status": "IN_PROGRESS"}
    
    # Admin -> Should Succeed
    r = client.patch(f"{settings.API_V1_STR}/missions/{m_id}", json=update_data, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "IN_PROGRESS"

    # Tech -> Should Succeed
    r = client.patch(f"{settings.API_V1_STR}/missions/{m_id}", json={"status": "DONE"}, headers=tech_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "DONE"

    # Viewer -> Should Fail (403)
    r = client.patch(f"{settings.API_V1_STR}/missions/{m_id}", json={"status": "DRAFT"}, headers=viewer_headers)
    assert r.status_code == 403

    # 3. READ Mission
    # All should succeed
    r = client.get(f"{settings.API_V1_STR}/missions/{m_id}", headers=admin_headers)
    assert r.status_code == 200
    
    r = client.get(f"{settings.API_V1_STR}/missions/{m_id}", headers=tech_headers)
    assert r.status_code == 200

    r = client.get(f"{settings.API_V1_STR}/missions/{m_id}", headers=viewer_headers)
    assert r.status_code == 200
