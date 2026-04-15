"""fix rls policies

Revision ID: 10108bf19829
Revises: 8a5c1a616f94
Create Date: 2026-02-12 14:57:48.036043

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10108bf19829'
down_revision: Union[str, Sequence[str], None] = '8a5c1a616f94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = [
        "users", "sites", "assets", "service_types", 
        "checklist_templates", "checklist_items", 
        "missions", "checklist_runs", "checklist_run_items", 
        "findings", "evidences", "comments", 
        "documents", "document_files", "audit_logs"
    ]
    
    for table in tables:
        # Drop old policy
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        # Create new policy that handles missing setting gracefully
        # nullif(current_setting(..., true), '') returns NULL if setting is missing or empty string.
        # If NULL, then tenant_id = NULL is FALSE (unless tenant_id is NULL), so no rows returned effectively.
        op.execute(f"CREATE POLICY tenant_isolation_policy ON {table} USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)")

def downgrade() -> None:
    tables = [
        "users", "sites", "assets", "service_types", 
        "checklist_templates", "checklist_items", 
        "missions", "checklist_runs", "checklist_run_items", 
        "findings", "evidences", "comments", 
        "documents", "document_files", "audit_logs"
    ]
    
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        # Revert to old policy (risky if setting missing, but correct for downgrade)
        op.execute(f"CREATE POLICY tenant_isolation_policy ON {table} USING (tenant_id = current_setting('app.current_tenant')::uuid)")
