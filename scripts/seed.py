import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Tenant, User, ServiceType, Site, Asset, ChecklistTemplate, ChecklistItem
from app.core.security import get_password_hash

def seed_data():
    db = SessionLocal()
    try:
        # Create Tenant
        tenant = db.query(Tenant).filter(Tenant.slug == "ascenseurs-express").first()
        if not tenant:
            tenant = Tenant(name="Ascenseurs Express", slug="ascenseurs-express")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"Created Tenant: {tenant.name}")
        
        # Create Users
        admin = db.query(User).filter(
            User.email == "admin@ascenseurs-express.com",
            User.tenant_id == tenant.id,
        ).first()
        if not admin:
            admin = User(
                email="admin@ascenseurs-express.com",
                password_hash=get_password_hash("admin123"),
                full_name="Admin User",
                role="ADMIN",
                tenant_id=tenant.id
            )
            db.add(admin)
            print(f"Created Admin: {admin.email}")

        # Create Site
        site = db.query(Site).filter(Site.name == "Immeuble Central", Site.tenant_id == tenant.id).first()
        if not site:
            site = Site(
                name="Immeuble Central",
                address_line1="123 Rue Principale",
                city="Paris",
                tenant_id=tenant.id
            )
            db.add(site)
            db.commit()
            db.refresh(site) # Need ID for asset

        # Create Service Types
        ctq = db.query(ServiceType).filter(ServiceType.code == "CTQ", ServiceType.tenant_id == tenant.id).first()
        if not ctq:
            ctq = ServiceType(
                code="CTQ",
                label="Contrôle Technique Quinquennal",
                tenant_id=tenant.id
            )
            db.add(ctq)
            db.commit() # Need ID for template
            db.refresh(ctq)

        # Create Checklist Template
        template = db.query(ChecklistTemplate).filter(
            ChecklistTemplate.title == "CTQ Standard v1", 
            ChecklistTemplate.tenant_id == tenant.id
        ).first()
        
        if not template:
            template = ChecklistTemplate(
                service_type_id=ctq.id,
                version="1.0",
                title="CTQ Standard v1",
                description="Contrôle technique standard",
                tenant_id=tenant.id
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            
            # Add Items
            items = [
                ChecklistItem(template_id=template.id, tenant_id=tenant.id, section="Cabine", label="Eclairage", item_type="BOOLEAN", order_index=1),
                ChecklistItem(template_id=template.id, tenant_id=tenant.id, section="Cabine", label="Sol", item_type="BOOLEAN", order_index=2),
                ChecklistItem(template_id=template.id, tenant_id=tenant.id, section="Machinerie", label="Frein", item_type="BOOLEAN", order_index=3),
            ]
            db.add_all(items)
            db.commit()
            print(f"Created Template: {template.title} with {len(items)} items")
        
        db.commit()
        print("Seed completed successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
