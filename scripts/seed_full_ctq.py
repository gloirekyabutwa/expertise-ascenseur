import sys
import os
import random
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add app to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.db.models import (
    Tenant, User, Site, Asset, Mission, ServiceType, Client,
    TenantAgency, MissionAttendee, MissionDocumentProvided, MissionPreviousControl, 
    MissionWorkItem, Attachment,
    ChecklistCatalog, AnomalyCatalog, MissionChecklistResult, MissionAnomaly,
    AssetTechnicalCharacteristics
)

def seed_full_ctq():
    db = SessionLocal()
    try:
        print("Clearing relevant tables...")
        # Clear specific tables (careful with dependencies)
        db.execute(text("TRUNCATE TABLE mission_checklist_results, mission_anomalies, mission_work_items, mission_attendees, mission_documents_provided, mission_previous_controls, missions, asset_technical_characteristics, assets, sites, clients, tenant_agencies, tenants, anomaly_catalog, checklist_categories, attachments CASCADE"))
        db.commit()

        print("Seeding Tenant...")
        tenant = Tenant(
            id="7327c495-606c-45c4-8896-416dd6a46367", # MATCH FRONTEND DEFAULT
            name="SaaS Ascenseurs Demo",
            slug="demo-asc",
            address="123 Rue de la République, 33000 Bordeaux", # Merged for simplicity or keep separate if model allows
            region="Nouvelle-Aquitaine",
            phone="01 23 45 67 89",
            website="www.saas-ascenseurs.com",
            siret="123 456 789 00012",
            capital="10 000 €",
            vat_id="FR 12 123456789",
            ape_code="4329B",
            legal_mentions="SAS au capital de 10 000 € - RCS Bordeaux B 123 456 789 - Code APE 4329B - TVA FR 12 123456789",
            agencies="Agence Bordeaux, Agence Paris", # Text field fallback
            branding_logo_url="https://via.placeholder.com/150",
            settings_json={"primary_color": "#003366"}
        )
        db.add(tenant)
        db.flush() 
        
        # Set RLS Context
        db.execute(text(f"SET app.current_tenant = '{tenant.id}'"))

        print("Seeding Agency...")
        agency = TenantAgency(
            tenant_id=tenant.id,
            name="Agence Bordeaux",
            address="45 Avenue de la Marne, 33000 Bordeaux",
            region="Nouvelle-Aquitaine",
            phone="05 56 00 00 00",
            email="bordeaux@saas-ascenseurs.com"
        )
        db.add(agency)
        
        # Create Admin User for Login
        from app.core.security import get_password_hash
        print("Seeding Admin User...")
        admin = User(
            email="admin@ascenseurs-express.com",
            password_hash=get_password_hash("admin123"),
            full_name="Admin Demo",
            role="ADMIN",
            tenant_id=tenant.id
        )
        db.add(admin)
        db.flush()
        
        print("Seeding Client...")
        client = Client(
            tenant_id=tenant.id,
            name="Syndic de Copropriété Le Lac",
            client_type="SYNDIC",
            legal_form="Syndic Professionnel",
            address_line1="10 Quai des Chartrons",
            postal_code="33000",
            city="Bordeaux",
            contact_name="M. Dupont",
            email="contact@syndic-le-lac.fr",
            phone="05 56 11 22 33"
        )
        db.add(client)
        db.flush()

        print("Seeding Site...")
        site = Site(
            tenant_id=tenant.id,
            client_id=client.id,
            name="Résidence La Plage",
            address_line1="12 Rue des Sables",
            city="Lacanau",
            postal_code="33680"
        )
        db.add(site)
        db.flush()

        print("Seeding Asset...")
        asset = Asset(
            tenant_id=tenant.id,
            site_id=site.id,
            label="Ascenseur Batiment A",
            installation_number="P 101 545",
            serial_number="SN-987654",
            manufacturer="Otis",
            model="Gen2",
            year_commissioned=2015,
            device_type="ASC",
            feature_type="Electrique",
            usage_type="Privé",
            # Legacy fields - can be null if TechnicalCharacteristics is used mostly
            load_capacity=630, 
            nominal_speed="1.00 m/s",
            maintainer_name="Ascenseurs Plaud",
        )
        db.add(asset)
        db.flush()
        
        # Seeding Technical Characteristics
        tech_specs = AssetTechnicalCharacteristics(
            tenant_id=tenant.id,
            asset_id=asset.id,
            load_capacity_kg=630,
            persons_capacity=8,
            nominal_speed_ms="1.00",
            travel_height_m="15.5",
            stops_count=5,
            machinery_type="Electrique sans local",
            machinery_location="Haut de gaine",
            controller_type="Microprocesseur",
            door_type="Automatique télescopique",
            safety_gear_type="Parachute à prise progressive",
            last_major_renovation_date=date(2020, 1, 15),
            maintenance_contract_ref="CTR-2023-001"
        )
        db.add(tech_specs)

        print("Seeding Service Types...")
        services = [
            {"code": "EXP-PONCT", "label": "Expertise Ponctuelle"},
            {"code": "ASS-PONCT", "label": "Assistance Ponctuelle"},
            {"code": "ASS-PER", "label": "Assistance Périodique"},
            {"code": "EXP-ASS-PER", "label": "Expertise et Assistance Périodique"},
            {"code": "CTQ-5", "label": "Contrôle Technique Quinquennal"},
            {"code": "AMO", "label": "Assistance à Maitrise d'ouvrage"},
            {"code": "CTRL-ACH", "label": "Contrôle Achèvement de Travaux"},
            {"code": "AMIANTE", "label": "Repérage Amiante Avant Travaux"},
            {"code": "PASS", "label": "Passation"}
        ]
        
        st = None
        for s in services:
            st_db = db.query(ServiceType).filter_by(code=s["code"]).first()
            if not st_db:
                st_db = ServiceType(code=s["code"], label=s["label"], tenant_id=tenant.id)
                db.add(st_db)
            if s["code"] == "CTQ-5":
                st = st_db
                
        db.flush()

        print("Seeding Mission...")
        mission = Mission(
            tenant_id=tenant.id,
            site_id=site.id,
            asset_id=asset.id,
            service_type_id=st.id,
            status="COMPLETED",
            scheduled_start=datetime.now(),
            started_at=datetime.now(),
            completed_at=datetime.now(),
            visit_start_datetime=datetime.now() - timedelta(hours=2),
            visit_end_datetime=datetime.now(),
            client_reference="REF-CLIENT-999",
            certification_number="CERT-XYZ-2026",
            owner_malveillance_flag=False,
            stop_request_flag=False,
            signed_at=datetime.now(),
            signed_by_name="Jean Controleur",
            place_signed="Lacanau",
            metadata_json={"report_number": "RP-2026-001"}
        )
        db.add(mission)
        db.flush()

        print("Seeding Attendees...")
        attendees = [
            MissionAttendee(mission_id=mission.id, tenant_id=tenant.id, full_name="Jean Controleur", role="Contrôleur Technique", company="SaaS Ascenseurs", is_present=True),
            MissionAttendee(mission_id=mission.id, tenant_id=tenant.id, full_name="M. le Gardien", role="Accompagnateur", company="Syndic Le Lac", is_present=True),
            MissionAttendee(mission_id=mission.id, tenant_id=tenant.id, full_name="Robert Tech", role="Technicien Maintenance", company="Ascenseurs Plaud", is_present=True)
        ]
        db.add_all(attendees)

        print("Seeding Previous Controls...")
        prev_control = MissionPreviousControl(
            mission_id=mission.id,
            tenant_id=tenant.id,
            control_date=date(2021, 5, 15),
            control_type="Contrôle Technique",
            report_number="RP-2021-888",
            result="Favorable avec réserves",
            technician_name="Paul Ancien"
        )
        db.add(prev_control)
        
        prev_control_2 = MissionPreviousControl(
            mission_id=mission.id,
            tenant_id=tenant.id,
            control_date=date(2016, 5, 10),
            control_type="Etude de Sécurité",
            report_number="ES-2016-001",
            result="Favorable",
            technician_name="Marc Expert"
        )
        db.add(prev_control_2)

        print("Seeding Documents...")
        docs = [
            MissionDocumentProvided(mission_id=mission.id, tenant_id=tenant.id, document_name="Dossier Technique", is_provided=True),
            MissionDocumentProvided(mission_id=mission.id, tenant_id=tenant.id, document_name="Carnet d'entretien", is_provided=True),
            MissionDocumentProvided(mission_id=mission.id, tenant_id=tenant.id, document_name="Rapport Vérification périodique", is_provided=False, observation_code="1 D", comment="Manquant lors de la visite")
        ]
        db.add_all(docs)

        print("Seeding Work Items...")
        work_items = [
            MissionWorkItem(mission_id=mission.id, tenant_id=tenant.id, deadline_year=2014, work_description="Mise en place téléalarme", status="DONE"),
            MissionWorkItem(mission_id=mission.id, tenant_id=tenant.id, deadline_year=2018, work_description="Précision d'arrêt", status="TODO", observation_code="I.2")
        ]
        db.add_all(work_items)
        
        # --- Checklist & Anomalies ---
        # Note: In real app, we need a Catalog seeding strategy. Assume catalog is seeded separately or create small one here.
        print("Seeding Checklist Catalog (Small Subset)...")
        cat_group = ChecklistCatalog(code="I", label="GAINE", item_type="GROUP")
        db.add(cat_group)
        db.flush()
        
        cat_item1 = ChecklistCatalog(parent_id=cat_group.id, code="I.1", label="Parois de la gaine", item_type="ITEM")
        cat_item2 = ChecklistCatalog(parent_id=cat_group.id, code="I.2", label="Ventilation", item_type="ITEM")
        db.add_all([cat_item1, cat_item2])
        db.flush()
        
        print("Seeding Checklist Results...")
        results = [
            MissionChecklistResult(mission_id=mission.id, tenant_id=tenant.id, catalog_item_id=cat_item1.id, status="CONCERNED", investigation_nature="E", observation_code=None),
            MissionChecklistResult(mission_id=mission.id, tenant_id=tenant.id, catalog_item_id=cat_item2.id, status="CONCERNED", investigation_nature="F", observation_code="1 A") # Anomaly
        ]
        db.add_all(results)
        
        print("Seeding Anomalies...")
        anomaly_cat = db.query(AnomalyCatalog).filter_by(code="1 A").first()
        if not anomaly_cat:
            anomaly_cat = AnomalyCatalog(code="1 A", description="Ventilation insuffisante ou obstruée", criticality="NORMAL")
            db.add(anomaly_cat)
            db.flush()
        
        mission_anomaly = MissionAnomaly(
            mission_id=mission.id,
            tenant_id=tenant.id,
            catalog_anomaly_id=anomaly_cat.id,
            status="OPEN",
            comment="Grille de ventilation peinte"
        )
        db.add(mission_anomaly)
        
        print("Seeding Signature Attachment...")
        # Mock signature file
        signature = Attachment(
            entity_type="MISSION",
            entity_id=mission.id,
            attachment_type="SIGNATURE",
            file_path="signatures/mission_signature.png", # Presigned URL will point here
            file_name="signature.png",
            mime_type="image/png",
            tenant_id=tenant.id
        )
        db.add(signature)
        
        # --- PDF Template ---
        from app.db.models.pdf import PdfTemplate, PdfTemplateStatus
        print("Seeding PDF Template...")
        # Ensure only one template exists
        existing_tpl = db.query(PdfTemplate).filter_by(code="CTQ_REPORT_V1").first()
        if not existing_tpl:
            pdf_tpl = PdfTemplate(
                tenant_id=tenant.id,
                code="CTQ_REPORT_V1",
                version=1,
                status=PdfTemplateStatus.ACTIVE,
                template_path="ctq_report_v1/index.html",
                style_path="ctq_report_v1/styles.css"
            )
            db.add(pdf_tpl)

        db.commit()
        print("Seeding Completed Successfully!")
        print(f"Mission ID: {mission.id}")

    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_full_ctq()
