import sys
import os
import logging
from uuid import UUID

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.pdf import PdfService
from app.db.models.pdf import PdfRenderRequest, PdfRenderStatus, PdfTemplate, PdfTemplateStatus
from app.db.models.missions import Mission
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_pdf_generation():
    db = SessionLocal()
    try:
        # 0. Set RLS Context (find tenant first)
        logger.info("Looking for tenant 'SaaS Ascenseurs Demo'...")
        tenant_id = "7327c495-606c-45c4-8896-416dd6a46367"
        
        # Set RLS Context
        db.execute(text(f"SET app.current_tenant = '{tenant_id}'"))

        # 1. Check Mission exists
        mission_id = UUID("4ff7794e-d556-45de-9404-5c3aff957444")
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            logger.error(f"Mission {mission_id} not found. Did you run seed_full_ctq.py?")
            return

        # 2. Ensure RLS Context matches mission (redundant but safe)
        db.execute(text(f"SET app.current_tenant = '{mission.tenant_id}'"))
        
        # 3. Check/Create Template
        template_code = "CTQ_REPORT_V1"
        template = db.query(PdfTemplate).filter(PdfTemplate.code == template_code).first()
        if not template:
            logger.info(f"Creating template {template_code}...")
            template = PdfTemplate(
                tenant_id=tenant_id,
                code=template_code,
                version=1,
                engine="WEASYPRINT",
                template_path="ctq_report_v1/index.html",
                style_path="ctq_report_v1/styles.css",
                status=PdfTemplateStatus.ACTIVE
            )
            db.add(template)
            db.commit()
            db.refresh(template)
        
        # 4. Create Render Request
        logger.info("Creating Render Request...")
        req = PdfRenderRequest(
            tenant_id=mission.tenant_id,
            entity_type="MISSION",
            entity_id=mission.id,
            doc_type="CTQ_REPORT",
            template_id=template.id,
            status=PdfRenderStatus.QUEUED,
            payload_json={}
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        
        # 5. Run Generation
        logger.info(f"Running generation for Request {req.id}...")
        service = PdfService(db)
        
        # Test prepare_context first
        context = service.prepare_context(mission.id, template, req.id)
        logger.info("Context preparation successful.")

        # Test render
        service.render_pdf(req.id)
        
        # 6. Verify Result
        db.refresh(req)
        if req.status == PdfRenderStatus.SUCCEEDED:
            logger.info(f"PDF Generation SUCCEEDED! Document ID: {req.output_document_id}")
        else:
            logger.error(f"PDF Generation FAILED: {req.error}")

    except Exception as e:
        logger.exception(f"Verification Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_pdf_generation()
