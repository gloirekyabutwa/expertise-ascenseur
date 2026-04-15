from fastapi.testclient import TestClient
from app.core.config import settings

def test_read_missions(client: TestClient, auth_headers: dict):
    response = client.get(
        f"{settings.API_V1_STR}/missions/",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_mission(client: TestClient, auth_headers: dict, db):
    # Get or create a service type and site
    from app.db.models import ServiceType, Site
    from sqlalchemy import text
    
    tenant_id = auth_headers.get("X-Tenant-ID")
    
    # Temporarily disable RLS for setup
    db.execute(text("SET app.current_tenant = :tenant_id"), {"tenant_id": tenant_id})
    
    st = db.query(ServiceType).filter(ServiceType.tenant_id == tenant_id).first()
    if not st:
        st = ServiceType(code="TEST_SERVICE", label="Test Service Type", tenant_id=tenant_id)
        db.add(st)
        db.commit()
        db.refresh(st)
    
    # Create or get a site
    site = db.query(Site).filter(Site.tenant_id == tenant_id).first()
    if not site:
        site = Site(name="Test Site", address_line1="123 Test St", tenant_id=tenant_id)
        db.add(site)
        db.commit()
        db.refresh(site)
    
    data = {
        "service_type_id": str(st.id),
        "site_id": str(site.id),
        "status": "DRAFT",
        "title": "Test Mission"
    }
    response = client.post(
        f"{settings.API_V1_STR}/missions/",
        headers=auth_headers,
        json=data
    )
    assert response.status_code == 200
    r_data = response.json()
    assert r_data["status"] == "DRAFT"
    assert r_data["service_type_id"] == str(st.id)

def test_read_checklist_templates(client: TestClient, auth_headers: dict):
    response = client.get(
        f"{settings.API_V1_STR}/checklist-templates",
         headers=auth_headers
    )
    assert response.status_code == 200
    assert len(response.json()) > 0
