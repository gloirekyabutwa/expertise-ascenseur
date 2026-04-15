"""seed_service_types

Revision ID: dc81ade9b1ce
Revises: 2ce792f69bef
Create Date: 2026-04-11 10:32:40.987968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc81ade9b1ce'
down_revision: Union[str, Sequence[str], None] = '2ce792f69bef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlalchemy.orm import Session
    from app.db.models import Tenant, ServiceType
    
    bind = op.get_bind()
    session = Session(bind=bind)
    
    services_data = [
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
    
    tenants = session.query(Tenant).all()
    for tenant in tenants:
        for s in services_data:
            exists = session.query(ServiceType).filter_by(tenant_id=tenant.id, code=s["code"]).first()
            if not exists:
                new_st = ServiceType(code=s["code"], label=s["label"], tenant_id=tenant.id)
                session.add(new_st)
    
    session.commit()


def downgrade() -> None:
    """Downgrade schema."""
    pass
