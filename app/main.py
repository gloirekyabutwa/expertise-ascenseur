from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routers import auth, tenants, users, sites, assets, services, missions, checklist_runs, findings, documents, pdf, clients, compliance, checklist, dashboard, photos

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Fallback/Dev mode - Allow everything
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(tenants.router, prefix=f"{settings.API_V1_STR}/tenants", tags=["tenants"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(sites.router, prefix=f"{settings.API_V1_STR}/sites", tags=["sites"])
app.include_router(assets.router, prefix=f"{settings.API_V1_STR}/assets", tags=["assets"])
app.include_router(services.router, prefix=f"{settings.API_V1_STR}", tags=["services"])
app.include_router(missions.router, prefix=f"{settings.API_V1_STR}/missions", tags=["missions"])
app.include_router(checklist_runs.router, prefix=f"{settings.API_V1_STR}/checklist-runs", tags=["checklist-runs"])
app.include_router(findings.router, prefix=f"{settings.API_V1_STR}/findings", tags=["findings"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(pdf.router, prefix=f"{settings.API_V1_STR}", tags=["pdf"])
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}/clients", tags=["clients"])
app.include_router(compliance.router, prefix=f"{settings.API_V1_STR}", tags=["compliance"])
app.include_router(checklist.router, prefix=f"{settings.API_V1_STR}", tags=["checklist"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(photos.router, prefix=f"{settings.API_V1_STR}", tags=["photos"])

@app.get("/")
def root():
    return {"message": "Welcome to SaaS Ascenseurs API"}

print(f"CORS ORIGINS LOADED: {settings.BACKEND_CORS_ORIGINS}")
