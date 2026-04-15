import os
import io
import logging
from uuid import UUID
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML, CSS

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.core.config import settings
from app.db.models.pdf import PdfRenderRequest, PdfRenderStatus, PdfTemplate
from app.db.models.missions import Mission
from app.db.models.services import ChecklistItem, ChecklistTemplate, ServiceType
from app.db.models.tenants_and_assets import Site, Asset, Tenant
from app.db.models.findings import Finding, Evidence
from app.db.models.documents import Document, DocumentFile
from app.db.models.client import Client
from app.db.models.compliance import (
    MissionAttendee, MissionDocumentProvided, MissionPreviousControl, 
    MissionWorkItem, Attachment
)
from app.db.models.checklist import (
    ChecklistCatalog, MissionChecklistResult, AnomalyCatalog, MissionAnomaly
)
from app.schemas.pdf import (
    PdfContext, TenantInfo, DocumentInfo, MissionInfo, SiteInfo, AssetInfo, 
    FindingInfo, ChecklistSectionInfo, ChecklistItemInfo, AnnexPhotoInfo, ClientInfo,
    MissionAttendeeInfo, MissionDocumentInfo, MissionPreviousControlInfo, 
    MissionWorkItemInfo, MissionAnomalyInfo
)
from app.services.storage.minio_storage import storage as minio_storage

logger = logging.getLogger(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "pdf", "templates")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(['html', 'xml'])
)

class PdfService:
    def __init__(self, db: Session):
        self.db = db
        self.storage = minio_storage

    def get_template(self, template_id: UUID) -> PdfTemplate:
        template = self.db.query(PdfTemplate).filter(PdfTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template

    def prepare_context(self, mission_id: UUID, template: PdfTemplate, request_id: UUID) -> PdfContext:
        mission = self.db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")
            
        tenant = self.db.query(Tenant).filter(Tenant.id == mission.tenant_id).first()
        site = self.db.query(Site).filter(Site.id == mission.site_id).first()
        
        client = None
        if site and site.client_id:
            client = self.db.query(Client).filter(Client.id == site.client_id).first()
        
        # --- Fetch Related Compliance Data ---
        
        # 1. Attendees
        attendees = self.db.query(MissionAttendee).filter(MissionAttendee.mission_id == mission_id).all()
        attendees_info = [MissionAttendeeInfo.model_validate(a) for a in attendees]
        
        # 2. Previous Controls
        prev_controls = self.db.query(MissionPreviousControl).filter(MissionPreviousControl.mission_id == mission_id).order_by(MissionPreviousControl.control_date.desc()).all()
        prev_controls_info = [MissionPreviousControlInfo.model_validate(pc) for pc in prev_controls]
        
        # 3. Documents Provided
        docs = self.db.query(MissionDocumentProvided).filter(MissionDocumentProvided.mission_id == mission_id).all()
        docs_info = [MissionDocumentInfo.model_validate(d) for d in docs]
        
        # 4. Work Items (Past or Future)
        work_items = self.db.query(MissionWorkItem).filter(MissionWorkItem.mission_id == mission_id).order_by(MissionWorkItem.deadline_year).all()
        work_items_info = [MissionWorkItemInfo.model_validate(wi) for wi in work_items]
        
        # 5. Anomalies
        anomalies = self.db.query(MissionAnomaly).options(joinedload(MissionAnomaly.catalog_anomaly)).filter(MissionAnomaly.mission_id == mission_id).all()
        anomalies_info = []
        for anom in anomalies:
            code = anom.custom_code
            desc = anom.custom_description
            crit = "NORMAL"
            
            if anom.catalog_anomaly:
                code = anom.catalog_anomaly.code
                desc = anom.catalog_anomaly.description
                crit = anom.catalog_anomaly.criticality
            
            anomalies_info.append(MissionAnomalyInfo(
                code=code,
                description=desc,
                criticality=crit,
                status=anom.status,
                comment=anom.comment
            ))
        
        # 6. Checklist Results (Grouped by Catalog Hierarchy effectively)
        # We need to reconstruct the hierarchy or just use flattened sections. This template expects sections.
        # Let's group by "Category" (from Catalog parent or similar).
        # For pixel-perfect CTQ, the PDF template iterates over hardcoded sections or we pass dynamic structure.
        # Let's query results join Catalog
        checklist_results = self.db.query(MissionChecklistResult).options(joinedload(MissionChecklistResult.catalog_item)).filter(MissionChecklistResult.mission_id == mission_id).all()
        
        # Dictionary to group by section (Parent Label usually)
        sections_map = {}
        for res in checklist_results:
            catalog_item = res.catalog_item
            if not catalog_item: 
                continue
                
            # If item has parent, use parent label as section title. If no parent, it IS a section/group?
            # In our seed, we had Groups -> Items.
            # Results are linked to Items.
            # So Catalog Item -> Parent -> Parent Label is the Section.
            
            # Since catalog_item is loaded, we can access parent. But `remote_side` relationship might need eager load too?
            # Let's retry fetching parent if lazy load issues occur, but SQLAlchemy might handle it if session open.
            
            # Simple logic: Section Name = Parent Label if exists, else "General"
            # BUT: In models, `remote_side` allows `catalog_item.parent`.
            # IMPORTANT: We need `joinedload(MissionChecklistResult.catalog_item).joinedload(ChecklistCatalog.parent)`
            pass # We should have eager loaded deeper
            
        # Re-query with deep load context to be safe or rely on lazy loading (which is fine in sync context)
        # Let's iterate and build.
        for res in checklist_results:
            item = res.catalog_item
            section_title = "Général"
            if item.parent:
                section_title = item.parent.label
            elif item.item_type == "GROUP":
               # Result on a group? Should not happen if we only answer items.
               section_title = item.label
            
            if section_title not in sections_map:
                sections_map[section_title] = []
                
            sections_map[section_title].append(ChecklistItemInfo(
                label=item.label,
                status=res.status,
                value=None, # Not in our CTQ model for now
                observation=res.observation_code
            ))
            
        checklist_sections = []
        for title, items in sections_map.items():
            checklist_sections.append(ChecklistSectionInfo(title=title, items=items))

        # --- Standard Findings (Legacy or parallel use) ---
        findings = self.db.query(Finding).options(joinedload(Finding.evidences)).filter(Finding.mission_id == mission_id).all()
        finding_infos = [FindingInfo.model_validate(f) for f in findings]

        # Annexes
        annexes = []
        for f in findings:
            for ev in f.evidences:
                if ev.kind == "PHOTO" and ev.document_file_id:
                    doc_file = self.db.query(DocumentFile).filter(DocumentFile.id == ev.document_file_id).first()
                    if doc_file:
                        annexes.append(AnnexPhotoInfo(
                            object_key=doc_file.object_key,
                            document_file_id=doc_file.id,
                            caption=ev.note_text or f.title,
                            finding_ref=f.title
                        ))

        asset = None
        if mission.asset_id:
            asset = self.db.query(Asset).options(joinedload(Asset.technical_characteristics)).filter(Asset.id == mission.asset_id).first()
            
        # Helper to get assignee name
        assignee_name = "Non assigné"
        if mission.assignee_user_id:
             # Need to import User if not available, strictly it is in tenants_and_assets
             from app.db.models.tenants_and_assets import User
             assignee = self.db.query(User).filter(User.id == mission.assignee_user_id).first()
             if assignee and assignee.full_name:
                 assignee_name = assignee.full_name

        # 8. Signature
        signature_url = None
        signature_attachment = self.db.query(Attachment).filter(
            Attachment.entity_type == "MISSION",
            Attachment.entity_id == mission.id,
            Attachment.attachment_type == "SIGNATURE"
        ).first()
        
        if signature_attachment:
            try:
                 # Generate URL immediately for the context
                 signature_url = self.storage.get_presigned_url(signature_attachment.file_path)
            except Exception as e:
                 logger.warning(f"Failed to generate signature URL: {e}")

        # Build Context
        # Build Context
        context = PdfContext(
            tenant=TenantInfo(
                name=tenant.name if tenant else "Unknown",
                branding_logo_url=tenant.branding_logo_url if tenant else None,
                address=tenant.address if tenant else None,
                region=tenant.region if tenant else None,
                phone=tenant.phone if tenant else None,
                fax=tenant.fax if tenant else None,
                website=tenant.website if tenant else None,
                siret=tenant.siret if tenant else None,
                capital=tenant.capital if tenant else None,
                vat_id=tenant.vat_id if tenant else None,
                ape_code=tenant.ape_code if tenant else None,
                legal_mentions=tenant.legal_mentions if tenant else None,
                agencies=tenant.agencies if tenant else None
            ),
            document=DocumentInfo(
                doc_type="CTQ_REPORT",
                title=f"Rapport {mission.certification_number or mission.id}",
                generated_at=datetime.utcnow(),
                render_request_id=request_id,
                version=template.version
            ),
            mission=MissionInfo(
                id=mission.id,
                service_type="CTQ",
                scheduled_date=mission.scheduled_start,
                visit_start_datetime=mission.visit_start_datetime,
                visit_end_datetime=mission.visit_end_datetime,
                assignee_name=assignee_name,
                # New Fields
                client_reference=mission.client_reference,
                certification_number=mission.certification_number,
                signed_at=mission.signed_at,
                signed_by_name=mission.signed_by_name,
                place_signed=mission.place_signed,
                # Signature
                assignee_role="Contrôleur Technique",
                signature_url=signature_url
            ),
            site=SiteInfo(
                name=site.name if site else "Unknown",
                address=(site.address_line1 or "") if site else "",
                postal_code=site.postal_code if site else None,
                city=site.city if site else None
            ),
            asset=AssetInfo(
                label=asset.label if asset else "Inconnu",
                serial_number=getattr(asset, 'serial_number', None),
                model=getattr(asset, 'model', None),
                commissioning_date=getattr(asset, 'commissioning_date', None),
                maintainer=getattr(asset, 'maintainer_name', None),
                # New CTQ Fields - Prefer TechnicalCharacteristics
                installation_number=asset.technical_characteristics.asset_id if (asset and asset.technical_characteristics and hasattr(asset.technical_characteristics, 'asset_id') and False) else (getattr(asset, 'installation_number', None)), # Logic fix below
                
                # Correct Logic: Use tech specs if available, else asset default keys
                year_commissioned=asset.technical_characteristics.year_commissioned if (asset and asset.technical_characteristics and asset.technical_characteristics.year_commissioned is not None) else getattr(asset, 'year_commissioned', None),
                
                device_type=getattr(asset, 'device_type', None), # Not in TechSpecs yet? Check model.
                feature_type=getattr(asset, 'feature_type', None),
                usage_type=getattr(asset, 'usage_type', None),
                
                load_capacity=asset.technical_characteristics.load_capacity_kg if (asset and asset.technical_characteristics and asset.technical_characteristics.load_capacity_kg is not None) else getattr(asset, 'load_capacity', None),
                
                max_passengers=asset.technical_characteristics.persons_capacity if (asset and asset.technical_characteristics and asset.technical_characteristics.persons_capacity is not None) else getattr(asset, 'max_passengers', None),
                
                nominal_speed=asset.technical_characteristics.nominal_speed_ms if (asset and asset.technical_characteristics and asset.technical_characteristics.nominal_speed_ms is not None) else getattr(asset, 'nominal_speed', None),
                
                number_of_levels=asset.technical_characteristics.stops_count if (asset and asset.technical_characteristics and asset.technical_characteristics.stops_count is not None) else getattr(asset, 'number_of_levels', None),
                
                machinery_location=asset.technical_characteristics.machinery_location if (asset and asset.technical_characteristics and asset.technical_characteristics.machinery_location is not None) else getattr(asset, 'machinery_location', None),
                
                maintainer_contract_ref=asset.technical_characteristics.maintenance_contract_ref if (asset and asset.technical_characteristics and asset.technical_characteristics.maintenance_contract_ref is not None) else getattr(asset, 'maintainer_contract_ref', None)
            ), 
            checklist_sections=checklist_sections,
            findings=finding_infos,
            annexes=annexes,
            client=ClientInfo.model_validate(client) if client else None,
            
            # New Lists
            attendees=attendees_info,
            documents_provided=docs_info,
            previous_controls=prev_controls_info,
            work_items=work_items_info,
            anomalies=anomalies_info
        )
        return context

    def render_pdf(self, request_id: UUID):
        try:
            # 1. Load Request
            request = self.db.query(PdfRenderRequest).filter(PdfRenderRequest.id == request_id).first()
            if not request:
                logger.error(f"Render request {request_id} not found")
                return

            # Idempotence + Retry Logic (Hardening #3)
            if request.status == PdfRenderStatus.SUCCEEDED:
                logger.info(f"Request {request_id} already succeeded. Skipping.")
                return
            
            if request.status == PdfRenderStatus.RUNNING:
                logger.info(f"Request {request_id} already running. Skipping.")
                return
            
            if request.status == PdfRenderStatus.FAILED:
                if request.retry_count >= request.max_retries:
                    logger.warning(f"Request {request_id} max retries ({request.max_retries}) reached.")
                    return
                logger.info(f"Retrying failed request {request_id} (attempt {request.retry_count + 1})")
                request.retry_count += 1

            request.status = PdfRenderStatus.RUNNING
            request.updated_at = datetime.utcnow()
            # NO commit here - single transaction (Hardening #2)

            # 2. Prepare or Load Context (Hardening #4: Reproducibility)
            template = self.get_template(request.template_id)
            
            if request.payload_json and len(request.payload_json) > 0 and 'tenant' in request.payload_json:
                # Reconstruct from saved payload for reproducibility
                context = PdfContext.model_validate(request.payload_json)
                logger.info(f"Rendering from saved payload for {request_id}")
            else:
                # First time: prepare and save
                context = self.prepare_context(request.entity_id, template, request_id)
                request.payload_json = context.model_dump(mode='json')
                logger.info(f"Prepared fresh context for {request_id}")

            # 3. Extract template type from options
            template_type = "FULL"
            if request.payload_json and 'options' in request.payload_json:
                template_type = request.payload_json['options'].get('template_type', "FULL")

            # 4. Generate fresh URLs for annexes (Hardening #5)
            for annex in context.annexes:
                try:
                    # Generate presigned URL at render time, not storage time
                    annex.url = self.storage.get_presigned_url(annex.object_key)
                except Exception as e:
                    logger.warning(f"Failed to generate URL for {annex.object_key}: {e}")
                    annex.url = "#"  # Fallback
            
            # 5. Render HTML
            jinja_template = env.get_template(template.template_path)
            # Pass the Pydantic object directly - Jinja2 can access attributes
            html_content = jinja_template.render(
                tenant=context.tenant,
                document=context.document,
                mission=context.mission,
                site=context.site,
                asset=context.asset,
                checklist_sections=context.checklist_sections,
                findings=context.findings,
                annexes=context.annexes,
                client=context.client,
                template_type=template_type
            )
            
            # 6. Render PDF
            css = []
            if template.style_path:
                 css_path = os.path.join(TEMPLATE_DIR, template.style_path)
                 if os.path.exists(css_path):
                     css.append(CSS(filename=css_path))
            
            pdf_bytes = HTML(string=html_content, base_url=TEMPLATE_DIR).write_pdf(stylesheets=css)
            
            # 6. Versioning with MAX (Hardening #1)
            existing_doc = self.db.query(Document).filter(
                Document.tenant_id == request.tenant_id,
                Document.mission_id == request.entity_id,
                Document.doc_type == request.doc_type
            ).first()

            if existing_doc:
                doc = existing_doc
                # Use MAX instead of COUNT for concurrency safety
                max_ver = self.db.query(func.max(DocumentFile.version)).filter(
                    DocumentFile.document_id == doc.id
                ).scalar() or 0
                new_version = max_ver + 1
            else:
                doc = Document(
                    tenant_id=request.tenant_id,
                    mission_id=request.entity_id,
                    doc_type=request.doc_type,
                    title=context.document.title,
                    status="FINAL"
                )
                self.db.add(doc)
                self.db.flush()
                new_version = 1

            # Naming convention: reports/{tenant_id}/{document_id}/v{version}.pdf
            file_name = f"reports/{request.tenant_id}/{doc.id}/v{new_version}.pdf"
            
            # 7. Upload
            pdf_stream = io.BytesIO(pdf_bytes)
            self.storage.upload_file(
                file_data=pdf_stream, 
                object_name=file_name, 
                content_type="application/pdf", 
                length=len(pdf_bytes)
            )
            
            # 8. Create Document Version with retry on conflict
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    doc_ver = DocumentFile(
                        tenant_id=request.tenant_id,
                        document_id=doc.id,
                        storage_provider="MINIO",
                        object_key=file_name,
                        mime_type="application/pdf",
                        size_bytes=len(pdf_bytes),
                        version=new_version
                    )
                    self.db.add(doc_ver)
                    self.db.flush()
                    break  # Success
                except IntegrityError as ie:
                    self.db.rollback()
                    if attempt < max_attempts - 1 and "uq_document_version" in str(ie):
                        # Recalculate version
                        max_ver = self.db.query(func.max(DocumentFile.version)).filter(
                            DocumentFile.document_id == doc.id
                        ).scalar() or 0
                        new_version = max_ver + 1
                        file_name = f"reports/{request.tenant_id}/{doc.id}/v{new_version}.pdf"
                        logger.warning(f"Version conflict, retrying with v{new_version}")
                    else:
                        raise
            
            # 9. Update Request
            request.status = PdfRenderStatus.SUCCEEDED
            request.output_document_id = doc.id
            request.output_document_version_id = doc_ver.id
            request.updated_at = datetime.utcnow()
            request.error = None  # Clear any previous error
            
            # SINGLE COMMIT (Hardening #2: RLS consistency)
            self.db.commit()
            
            logger.info(f"PDF generated successfully: {file_name}")

        except Exception as e:
            logger.exception(f"PDF Generation Failed: {e}")
            if request:
                self.db.rollback()
                request.status = PdfRenderStatus.FAILED
                request.error = str(e)
                request.updated_at = datetime.utcnow()
                self.db.commit()

# Helper to run in background
def run_pdf_generation(request_id: UUID, tenant_id: UUID):
    from app.db.session import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    try:
        # Enforce RLS Context (Validation Point 5)
        db.execute(text("SET LOCAL app.current_tenant = :tenant_id"), {"tenant_id": str(tenant_id)})
        service = PdfService(db)
        service.render_pdf(request_id)
    finally:
        db.close()
