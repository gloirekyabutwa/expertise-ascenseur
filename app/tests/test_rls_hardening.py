from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.db.models import User, Tenant, Mission, ServiceType
from app.core import security
import uuid
import pytest

def test_rls_policy_correctness(db: Session):
    # 1. Reset setting
    db.execute(text("RESET app.current_tenant"))
    
    # 2. Query missions
    # Should be 0 because tenant_id = NULL (from empty setting) matches nothing (unless tenant_id is null, which is not allowed)
    count = db.execute(text("SELECT count(*) FROM missions")).scalar()
    assert count == 0

def test_connection_cleanup(client: TestClient, superuser_db: Session, tenant_header):
    # Setup 2 tenants
    t1_id = tenant_header["X-Tenant-ID"]
    
    t2_slug = f"tenant-{uuid.uuid4().hex[:8]}"
    t2 = Tenant(name="Tenant 2", slug=t2_slug, settings_json={})
    superuser_db.add(t2)
    superuser_db.commit()
    superuser_db.refresh(t2)
    t2_id = str(t2.id)
    
    # Add Data to T1
    st1 = ServiceType(code=f"ST1-{uuid.uuid4().hex[:4]}", label="ST1", tenant_id=t1_id)
    superuser_db.add(st1)
    superuser_db.commit()
    m1 = Mission(tenant_id=t1_id, service_type_id=st1.id, status="DRAFT", metadata_json={})
    superuser_db.add(m1)
    superuser_db.commit()
    
    # Add Data to T2
    st2 = ServiceType(code=f"ST2-{uuid.uuid4().hex[:4]}", label="ST2", tenant_id=t2_id)
    superuser_db.add(st2)
    superuser_db.commit()
    m2 = Mission(tenant_id=t2_id, service_type_id=st2.id, status="DRAFT", metadata_json={})
    superuser_db.add(m2)
    superuser_db.commit()
    
    # Get Admin Token (T1)
    t1_admin_email = "admin@ascenseurs-express.com" # Seeded admin
    login_data = {"username": t1_admin_email, "password": "admin123"}
    r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data, headers={"X-Tenant-ID": t1_id})
    token_t1 = r.json()["access_token"]
    headers_t1 = {"Authorization": f"Bearer {token_t1}", "X-Tenant-ID": t1_id}

    # Create Admin for T2
    t2_admin_email = f"admin-{uuid.uuid4().hex[:4]}@t2.com"
    user_t2 = User(email=t2_admin_email, password_hash=security.get_password_hash("password"), role="ADMIN", tenant_id=t2_id)
    superuser_db.add(user_t2)
    superuser_db.commit()
    
    login_data_t2 = {"username": t2_admin_email, "password": "password"}
    r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data_t2, headers={"X-Tenant-ID": t2_id})
    assert r.status_code == 200
    token_t2 = r.json()["access_token"]
    headers_t2 = {"Authorization": f"Bearer {token_t2}", "X-Tenant-ID": t2_id}

    # 1. Access T1 -> Should see m1
    r = client.get(f"{settings.API_V1_STR}/missions", headers=headers_t1)
    assert r.status_code == 200
    data = r.json()
    ids = [m["id"] for m in data]
    assert str(m1.id) in ids
    assert str(m2.id) not in ids
    
    # 2. Access T2 -> Should see m2 (and NOT m1) - Same Client Process
    r = client.get(f"{settings.API_V1_STR}/missions", headers=headers_t2)
    assert r.status_code == 200
    data = r.json()
    ids = [m["id"] for m in data]
    assert str(m2.id) in ids
    assert str(m1.id) not in ids
    
    # 3. Access T1 again -> Back to T1 context
    r = client.get(f"{settings.API_V1_STR}/missions", headers=headers_t1)
    assert r.status_code == 200
    data = r.json()
    ids = [m["id"] for m in data]
    assert str(m1.id) in ids
    assert str(m2.id) not in ids

# Verify Transition endpoints (simulated via update)
def test_rbac_transitions(client: TestClient, superuser_db: Session, tenant_header):
    tenant_id = tenant_header["X-Tenant-ID"]
    
    # Create Mission
    st = ServiceType(code=f"ST-RBAC-TRANS-{uuid.uuid4().hex[:4]}", label="RBAC Trans", tenant_id=tenant_id)
    superuser_db.add(st)
    superuser_db.commit()
    m = Mission(tenant_id=tenant_id, service_type_id=st.id, status="DRAFT", metadata_json={})
    superuser_db.add(m)
    superuser_db.commit()
    m_id = m.id
    
    # Create Viewer
    viewer_email = f"viewer-{uuid.uuid4().hex[:4]}@test.com"
    viewer = User(email=viewer_email, password_hash=security.get_password_hash("password"), role="VIEWER", tenant_id=tenant_id)
    superuser_db.add(viewer)
    superuser_db.commit()
    
    login_data = {"username": viewer_email, "password": "password"}
    r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data, headers=tenant_header)
    token = r.json()["access_token"]
    headers_viewer = {"Authorization": f"Bearer {token}", **tenant_header}
    
    # Attempt Update (Transition) -> 403
    r = client.patch(f"{settings.API_V1_STR}/missions/{m_id}", json={"status": "IN_PROGRESS"}, headers=headers_viewer)
    assert r.status_code == 403
