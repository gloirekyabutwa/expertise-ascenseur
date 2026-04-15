import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import SessionLocal
from app.main import app
from app.core.config import settings
from app.api.routers.auth import get_db

# Use a separate test database or the same one for MVP (with care)
# For MVP, we'll use the main DB but ideally should use a test DB
# We will use the same DB but rollback transactions if possible, 
# or just rely on seed data. Since we seeded, we can use that.

@pytest.fixture(scope="session")
def db() -> Generator:
    yield SessionLocal()

@pytest.fixture(scope="module")
def client() -> Generator:
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_token_headers(client: TestClient, tenant_header) -> dict:
    login_data = {
        "username": "admin@ascenseurs-express.com",
        "password": "admin123"
    }
    # Pass the tenant header explicitly
    headers = tenant_header
    r = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data, headers=headers)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        pytest.fail("Login failed")
    tokens = r.json()
    a_token = tokens["access_token"]
    # Combine auth token and tenant ID
    return {"Authorization": f"Bearer {a_token}", **tenant_header}

@pytest.fixture(scope="session")
def superuser_db() -> Generator:
    # Connect as postgres superuser to bypass RLS for setup
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Force postgres user
    superuser_uri = str(settings.SQLALCHEMY_ADMIN_DATABASE_URI)
    engine = create_engine(superuser_uri)
    SessionSuper = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionSuper()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
def tenant_header(superuser_db) -> dict:
    # Use superuser_db to fetch tenant without RLS issues
    from app.db.models import Tenant
    tenant = superuser_db.query(Tenant).filter(Tenant.slug == "ascenseurs-express").first()
    return {"X-Tenant-ID": str(tenant.id)}

@pytest.fixture(scope="module")
def auth_headers(admin_token_headers, tenant_header):
    return {**admin_token_headers, **tenant_header}
