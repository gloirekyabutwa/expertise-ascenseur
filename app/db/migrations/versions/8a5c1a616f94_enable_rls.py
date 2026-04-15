"""enable_rls

Revision ID: 8a5c1a616f94
Revises: <previous_revision_id>
Create Date: 2026-02-12 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = '8a5c1a616f94'
down_revision = '50ee51972b1a'
branch_labels = None
depends_on = None

def upgrade():
    # Tables to enable RLS on
    tables = [
        "users", "sites", "assets", "service_types", 
        "checklist_templates", "checklist_items", 
        "missions", "checklist_runs", "checklist_run_items", 
        "findings", "evidences", "comments", 
        "documents", "document_files", "audit_logs"
    ]
    
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        # Create policy: Allow ALL operations if tenant_id matches current_setting('app.current_tenant')
        # We cast to UUID to match the column type
        op.execute(f"CREATE POLICY tenant_isolation_policy ON {table} USING (tenant_id = current_setting('app.current_tenant')::uuid)")

def downgrade():
    tables = [
        "users", "sites", "assets", "service_types", 
        "checklist_templates", "checklist_items", 
        "missions", "checklist_runs", "checklist_run_items", 
        "findings", "evidences", "comments", 
        "documents", "document_files", "audit_logs"
    ]
    
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
