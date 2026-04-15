from fastapi.testclient import TestClient
from app.core.config import settings
from sqlalchemy import text
import uuid
import pytest

def test_rls_isolation(client: TestClient, db, superuser_db, auth_headers, tenant_header):
    # 1. Setup Data using Superuser (Bypass RLS)
    from app.db.models import Tenant, Mission, ServiceType
    
    # Tenant 1 is already seeded and we have auth_headers for it (from conftest)
    # We need the ID of Tenant 1
    t1_slug = "ascenseurs-express"
    t1 = superuser_db.query(Tenant).filter(Tenant.slug == t1_slug).first()
    assert t1 is not None
    t1_id = t1.id

    # Create Tenant 2
    t2_slug = f"tenant-{uuid.uuid4().hex[:8]}"
    t2 = Tenant(name="Tenant 2", slug=t2_slug, settings_json={})
    superuser_db.add(t2)
    superuser_db.commit()
    superuser_db.refresh(t2)
    t2_id = t2.id

    # Create Service Types
    st1 = ServiceType(code=f"ST1-{uuid.uuid4().hex[:4]}", label="Service Type 1", tenant_id=t1_id)
    st2 = ServiceType(code=f"ST2-{uuid.uuid4().hex[:4]}", label="Service Type 2", tenant_id=t2_id)
    superuser_db.add_all([st1, st2])
    superuser_db.commit()
    
    # Create Missions
    m1 = Mission(tenant_id=t1_id, service_type_id=st1.id, status="DRAFT", metadata_json={"desc": "Mission for Tenant 1"})
    m2 = Mission(tenant_id=t2_id, service_type_id=st2.id, status="DRAFT", metadata_json={"desc": "Mission for Tenant 2"})
    superuser_db.add_all([m1, m2])
    superuser_db.commit()
    superuser_db.refresh(m1)
    superuser_db.refresh(m2)

    # 2. Test "No Tenant Set" -> 0 rows (Raw DB check as app_user)
    # We use 'db' fixture which is app_user session. We verify no context is set by default or explicit reset.
    db.execute(text("RESET app.current_tenant"))
    result = db.execute(text("SELECT count(*) FROM missions")).scalar()
    # Should be 0 because policy requires tenant_id = nullif(current_setting(...), '')
    # If setting is missing/null, predicate is tenant_id = NULL, which is false.
    assert result == 0, "Expected 0 rows when no tenant context is set"

    # 3. Test "Tenant A set" -> Only A rows (via API)
    # auth_headers contains Bearer token (admin of T1) and X-Tenant-ID of T1
    response = client.get(f"{settings.API_V1_STR}/missions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    ids = [m["id"] for m in data]
    assert str(m1.id) in ids
    assert str(m2.id) not in ids

    # 4. Test "Tenant B set" -> Only B rows (via API)
    # We need a token for Tenant 2? 
    # Or we can just use the same admin token if the system allows cross-tenant user mapping?
    # In this MVP, users are bound to a tenant. Admin is bound to Tenant 1.
    # If we send Tenant 2 header with Tenant 1 token:
    # Login will fail or token validation might pass but user retrieval might fail if RLS applies to users table too.
    # Users table HAS RLS.
    # So Admin User (Tenant 1) is NOT visible if we set context to Tenant 2.
    # So authentication should fail or return 401/403.
    
    t2_headers = {
        "Authorization": auth_headers["Authorization"],
        "X-Tenant-ID": str(t2_id)
    }
    response = client.get(f"{settings.API_V1_STR}/missions", headers=t2_headers)
    # Since User is in T1, and we set T2 context, the query `SELECT * FROM users WHERE email=...` will return Nothing.
    # So `get_current_user` will fail.
    assert response.status_code in [401, 403, 404], f"Should fail to auth/access T2 with T1 user. Got {response.status_code}"

    # To test seeing T2 data, we need a T2 user.
    # Create T2 user
    user2_email = f"user2-{uuid.uuid4().hex[:4]}@example.com"
    from app.core.security import get_password_hash
    from app.db.models import User
    user2 = User(
        email=user2_email, 
        password_hash=get_password_hash("password"),
        tenant_id=t2_id,
        role="ADMIN",
        full_name="User Tenant 2"
    )
    superuser_db.add(user2)
    superuser_db.commit()
    
    # Login as T2 user
    login_data = {"username": user2_email, "password": "password"}
    # Pass T2 header for login to find the user
    login_headers = {"X-Tenant-ID": str(t2_id)} 
    r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data, headers=login_headers)
    assert r.status_code == 200
    t2_token = r.json()["access_token"]
    
    t2_auth_headers = {"Authorization": f"Bearer {t2_token}", "X-Tenant-ID": str(t2_id)}
    
    # Query Missions as T2
    response = client.get(f"{settings.API_V1_STR}/missions", headers=t2_auth_headers)
    assert response.status_code == 200
    data = response.json()
    ids = [m["id"] for m in data]
    assert str(m2.id) in ids
    assert str(m1.id) not in ids

    # 5. Cross-tenant API Access checks (Direct ID access)
    # Try to access M1 using T2 token
    response = client.get(f"{settings.API_V1_STR}/missions/{m1.id}", headers=t2_auth_headers)
    # Should be 404 Not Found (as it's filtered out)
    assert response.status_code == 404

    # Try to access M2 using T1 token
    response = client.get(f"{settings.API_V1_STR}/missions/{m2.id}", headers=auth_headers)
    assert response.status_code == 404
