import sys
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:password@localhost:5432/app"
TENANT_ID = '7327c495-606c-45c4-8896-416dd6a46367'

engine = create_engine(DB_URL)
with engine.connect() as conn:
    # Sites
    sites = conn.execute(text(f"SELECT count(*) FROM sites WHERE tenant_id = '{TENANT_ID}'")).scalar()
    print(f"SITES_COUNT:{sites}")
    
    # Missions
    missions = conn.execute(text(f"SELECT count(*) FROM missions WHERE tenant_id = '{TENANT_ID}'")).scalar()
    print(f"MISSIONS_COUNT:{missions}")
    
    # Check mission-site linkage
    orphans = conn.execute(text(f"SELECT count(*) FROM missions WHERE tenant_id = '{TENANT_ID}' AND site_id IS NULL")).scalar()
    print(f"ORPHAN_MISSIONS_COUNT:{orphans}")
    
    # Check if mission's site belongs to tenant
    mismatched = conn.execute(text(f"""
        SELECT count(*) 
        FROM missions m
        LEFT JOIN sites s ON m.site_id = s.id
        WHERE m.tenant_id = '{TENANT_ID}' 
        AND (s.id IS NULL OR s.tenant_id != '{TENANT_ID}')
    """)).scalar()
    print(f"MISMATCHED_MISSIONS_COUNT:{mismatched}")
