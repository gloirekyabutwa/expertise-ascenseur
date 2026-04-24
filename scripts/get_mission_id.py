import sys
import os
from sqlalchemy import create_engine, text

# Database settings from config (standard)
DB_URL = "postgresql://postgres:password@localhost:5432/app"

engine = create_engine(DB_URL)
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, certification_number FROM missions WHERE certification_number = 'CERT-XYZ-2026' LIMIT 1;"))
    for row in result:
        print(f"MISSION_ID:{row[0]}")
