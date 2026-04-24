"""enable rls for recent tenant tables

Revision ID: b9d7f5d6d0b4
Revises: 5824a245bb76
Create Date: 2026-04-16 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b9d7f5d6d0b4"
down_revision: Union[str, Sequence[str], None] = "5824a245bb76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RLS_POLICY = """
CREATE POLICY tenant_isolation_policy ON {table}
USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
"""


def upgrade() -> None:
    tables = [
        "clients",
        "asset_technical_characteristics",
        "attachments",
        "tenant_agencies",
        "mission_anomalies",
        "mission_attendees",
        "mission_checklist_results",
        "mission_documents_provided",
        "mission_previous_controls",
        "mission_work_items",
        "mission_photos",
    ]

    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        op.execute(RLS_POLICY.format(table=table))


def downgrade() -> None:
    tables = [
        "clients",
        "asset_technical_characteristics",
        "attachments",
        "tenant_agencies",
        "mission_anomalies",
        "mission_attendees",
        "mission_checklist_results",
        "mission_documents_provided",
        "mission_previous_controls",
        "mission_work_items",
        "mission_photos",
    ]

    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
