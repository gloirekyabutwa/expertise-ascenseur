import os
import shutil
import sys

from sqlalchemy.orm import sessionmaker

TEMPLATE_DIR = "/app/app/services/pdf/templates"

def copy_template(src, dest):
    src_path = os.path.join(TEMPLATE_DIR, src)
    dest_path = os.path.join(TEMPLATE_DIR, dest)
    if not os.path.exists(dest_path):
        shutil.copytree(src_path, dest_path)
    
    # Update title in index.html
    idx_path = os.path.join(dest_path, "index.html")
    with open(idx_path, 'r') as f:
        content = f.read()
    
    if dest == "amo_report_v1":
         content = content.replace("Contrôle Technique Quinquennal", "Assistance à Maîtrise d'Ouvrage")
         content = content.replace("CTQ", "AMO")
    elif dest == "amiante_report_v1":
         content = content.replace("Contrôle Technique Quinquennal", "Repérage Amiante Avant Travaux")
         content = content.replace("CTQ", "AMIANTE")
    else:
         content = content.replace("Contrôle Technique Quinquennal", "Expertise Technique")
         content = content.replace("CTQ", "EXPERTISE")
         
    with open(idx_path, 'w') as f:
         f.write(content)

copy_template("ctq_report_v1", "amo_report_v1")
copy_template("ctq_report_v1", "amiante_report_v1")
copy_template("ctq_report_v1", "generic_report_v1")

# Also insert PdfTemplate records into DB
from app.db.session import SessionLocal
from app.db.models.pdf import PdfTemplate

db = SessionLocal()
# Assume tenant_id from existing
existing = db.query(PdfTemplate).first()
if existing:
    tenant_id = existing.tenant_id
    
    # AMO
    if not db.query(PdfTemplate).filter(PdfTemplate.code == "AMO_REPORT_V1").first():
        db.add(PdfTemplate(
            tenant_id=tenant_id,
            code="AMO_REPORT_V1",
            name="Rapport AMO V1",
            description="Modèle de rapport générique AMO",
            template_path="amo_report_v1/index.html",
            style_path="amo_report_v1/styles.css",
            version="1.0"
        ))
    
    # AMIANTE
    if not db.query(PdfTemplate).filter(PdfTemplate.code == "AMIANTE_REPORT_V1").first():
        db.add(PdfTemplate(
            tenant_id=tenant_id,
            code="AMIANTE_REPORT_V1",
            name="Rapport Amiante V1",
            description="Modèle de rapport générique AMIANTE",
            template_path="amiante_report_v1/index.html",
            style_path="amiante_report_v1/styles.css",
            version="1.0"
        ))
        
    # GENERIC
    if not db.query(PdfTemplate).filter(PdfTemplate.code == "GENERIC_REPORT_V1").first():
        db.add(PdfTemplate(
            tenant_id=tenant_id,
            code="GENERIC_REPORT_V1",
            name="Rapport Expertise V1",
            description="Modèle de rapport générique",
            template_path="generic_report_v1/index.html",
            style_path="generic_report_v1/styles.css",
            version="1.0"
        ))
        
    db.commit()
db.close()
print("Created templates and seeded DB")
