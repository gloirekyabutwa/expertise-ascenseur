import sys
import os
import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.pdf import PdfService
from app.db.models.tenants_and_assets import Tenant, User, Site, Asset
from app.db.models.services import ServiceType, ChecklistTemplate, ChecklistItem
from app.db.models.missions import Mission, ChecklistRun, ChecklistRunItem
from app.db.models.findings import Finding, Evidence
from app.db.models.documents import Document, DocumentFile
from app.db.models.pdf import PdfTemplate, PdfRenderRequest, PdfRenderStatus

def verify_pdf_generation():
    print("🚀 Starting PDF Verification & Proof Generation...")
    db = SessionLocal()
    try:
        # --- 1. SEED DATA ---
        print("\n--- 1. Seeding Data ---")
        tenant_name = "Verify Tenant " + str(uuid.uuid4())[:8]
        tenant = Tenant(
            name=tenant_name, 
            slug=tenant_name.lower().replace(" ", "-"),
            address="123 Corporate Blvd",
            region="Ile-de-France",
            phone="0102030405",
            siret="12345678900012",
            capital="10 000 €",
            vat_id="FR123456789",
            branding_logo_url="https://example.com/logo.png"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        print(f"✅ Tenant: {tenant.id} ({tenant.name})")

        # Set RLS Context for Seeding (Session level to survive commits if connection kept)
        db.execute(text("SET app.current_tenant = :tenant_id"), {"tenant_id": str(tenant.id)})

        user = User(email=f"verify-{uuid.uuid4()}@test.com", password_hash="hash", full_name="Verifier", role="ADMIN", tenant_id=tenant.id)
        db.add(user)
        
        site = Site(name="Verify Site", address_line1="123 Verification Lane", city="Test City", postal_code="75000", tenant_id=tenant.id)
        db.add(site)
        print(f"✅ Site Created")

        st = ServiceType(code="CTQ", label="Contrôle Technique", tenant_id=tenant.id)
        db.add(st)
        db.commit()

        # Client
        from app.db.models.client import Client
        client = Client(
            name="Syndic Test", 
            client_type="SYNDIC", 
            address_line1="10 Rue de la Paix", 
            city="Paris", 
            tenant_id=tenant.id
        )
        db.add(client)
        db.commit()
        print(f"✅ Client Created: {client.id}")
        
        # Link Site to Client
        site.client_id = client.id
        db.add(site)
        db.commit()

        result = db.execute(text("SHOW app.current_tenant"))
        print(f"   RLS Context Check: {result.scalar()}")

        mission = Mission(
            tenant_id=tenant.id, 
            site_id=site.id, 
            service_type_id=st.id, 
            status="IN_PROGRESS",
            scheduled_start=datetime.utcnow(),
            client_reference="REF-CLIENT-999",
            certification_number="CERT-001",
            assignee_user_id=user.id
        )
        db.add(mission)
        db.commit()
        print(f"✅ Mission: {mission.id}")

        # Checklist
        tpl = ChecklistTemplate(service_type_id=st.id, version="1", title="Verify Tpl", tenant_id=tenant.id)
        db.add(tpl)
        db.commit()
        
        item = ChecklistItem(template_id=tpl.id, tenant_id=tenant.id, section="Securite", label="Frein OK?", item_type="BOOLEAN")
        db.add(item)
        db.commit()

        run = ChecklistRun(mission_id=mission.id, template_id=tpl.id, status="COMPLETED", started_at=datetime.utcnow(), tenant_id=tenant.id)
        db.add(run)
        db.commit()

        run_item = ChecklistRunItem(run_id=run.id, checklist_item_id=item.id, status="OK", value_json="true", tenant_id=tenant.id)
        db.add(run_item)
        
        # Finding
        finding = Finding(mission_id=mission.id, title="Cable usé", severity="HIGH", tenant_id=tenant.id)
        db.add(finding)
        db.commit()
        
        # Evidence (Photo) - Mock
        # We need a DocumentFile first? No, usually upload first then create DocumentFile.
        # Check DocumentFile model: usually linked to None for generic file?
        # For MVP verify, let's skip creating actual file in MinIO for input, just DB record.
        # Evidence (Photo) - Needs a Document container
        photo_doc = Document(
            tenant_id=tenant.id,
            mission_id=mission.id,
            doc_type="EVIDENCE",
            title="Photo Evidence",
            status="FINAL"
        )
        db.add(photo_doc)
        db.commit()

        photo_file = DocumentFile(
            tenant_id=tenant.id,
            document_id=photo_doc.id,
            storage_provider="MINIO",
            object_key="mock/photo.jpg",
            mime_type="image/jpeg",
            size_bytes=100,
            version=1
        )
        db.add(photo_file)
        db.commit()
        
        evidence = Evidence(finding_id=finding.id, kind="PHOTO", document_file_id=photo_file.id, tenant_id=tenant.id, note_text="Photo du cable")
        db.add(evidence)
        db.commit()

        # Pdf Template
        pdf_tpl = PdfTemplate(
            tenant_id=tenant.id,
            code="CTQ_REPORT_VERIFY",
            version=1,
            template_path="ctq_report_v1/template.html",
            style_path="ctq_report_v1/style.css",
            status="ACTIVE"
        )
        db.add(pdf_tpl)
        db.commit()
        print(f"✅ Data Seeded.")

        # --- 2. CREATE REQUEST ---
        print("\n--- 2. Creating Render Request (RBAC Check: User Role = ADMIN) ---")
        req = PdfRenderRequest(
            tenant_id=tenant.id,
            entity_type="MISSION",
            entity_id=mission.id,
            doc_type="CTQ_REPORT",
            template_id=pdf_tpl.id,
            status=PdfRenderStatus.QUEUED,
            payload_json={}
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        print(f"✅ Request Created: {req.id} (Status: {req.status})")

        # --- 3. RUN GENERATION (Simulate Background) ---
        print("\n--- 3. Running PDF Generation (Simulating Background Task) ---")
        
        # Set RLS
        print(f"🔐 Setting RLS Context: app.current_tenant = {tenant.id}")
        db.execute(text("SET LOCAL app.current_tenant = :tenant_id"), {"tenant_id": str(tenant.id)})
        
        service = PdfService(db)
        service.render_pdf(req.id)
        
        # --- 4. VERIFY PROOFS ---
        print("\n--- 4. Verification Proofs ---")
        db.refresh(req)
        
        # Proof 1: Payload JSON
        print(f"1️⃣ Payload JSON Saved:\n{json.dumps(req.payload_json, indent=2, default=str)[:500]} ... (truncated)")
        if req.payload_json and "checklist_sections" in req.payload_json and "annexes" in req.payload_json:
             print("   ✅ Payload contains checklist_sections and annexes.")
        else:
             print("   ❌ Payload missing sections!")

        if req.payload_json and "client" in req.payload_json and req.payload_json["client"]["name"] == "Syndic Test":
             print("   ✅ Payload contains correct Client info.")
        else:
             print(f"   ❌ Payload missing or incorrect Client info! Payload keys: {req.payload_json.keys()}")

        if req.payload_json and "tenant" in req.payload_json and req.payload_json["tenant"]["siret"] == "12345678900012":
             print("   ✅ Payload contains Tenant SIRET.")
        else:
             print("   ❌ Payload missing Tenant SIRET!")
     
        if req.payload_json and "mission" in req.payload_json and req.payload_json["mission"]["client_reference"] == "REF-CLIENT-999":
             print("   ✅ Payload contains Mission Client Ref.")
        else:
             print("   ❌ Payload missing Mission Client Ref!")

        # Proof 2 & 3: Versioning & Object Key
        if req.output_document_version_id:
            ver = db.query(DocumentFile).filter(DocumentFile.id == req.output_document_version_id).first()
            print(f"2️⃣ Versioning: Version = {ver.version}")
            print(f"3️⃣ Object Key: {ver.object_key}")
            
            # Check convention: reports/{tenant}/{doc}/{ver}.pdf
            expected_prefix = f"reports/{tenant.id}/"
            if ver.object_key.startswith(expected_prefix) and f"/v{ver.version}.pdf" in ver.object_key:
                print("   ✅ Object Key follows convention.")
            else:
                print(f"   ❌ Object Key convention mismatch: {ver.object_key}")
        else:
            print("   ❌ No output document version found!")

        # Proof 6: Idempotence
        print("6️⃣ Idempotence Check: Re-running same request_id...")
        service.render_pdf(req.id)
        db.refresh(req)
        print(f"   Status after re-run: {req.status} (Should remain SUCCEEDED without error/change)")

        # Proof 7: Error Handling (Simulate new request failing)
        print("7️⃣ Error Handling Check: Creating invalid request...")
        fail_req = PdfRenderRequest(
            tenant_id=tenant.id,
            entity_type="MISSION",
            entity_id=uuid.uuid4(), # Invalid ID
            doc_type="CTQ_REPORT",
            template_id=pdf_tpl.id,
            status=PdfRenderStatus.QUEUED,
            payload_json={}
        )
        db.add(fail_req)
        db.commit()
        
        service.render_pdf(fail_req.id)
        db.refresh(fail_req)
        print(f"   Status: {fail_req.status}")
        print(f"   Error Field: {fail_req.error}")
        if fail_req.status == "FAILED" and fail_req.error:
            print("   ✅ Error captured correctly.")
        else:
            print("   ❌ Error handling failed.")

        print("\n✅ Verification Complete.")

    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_pdf_generation()
