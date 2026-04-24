
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.db.models.checklist import ChecklistCatalog

def check_catalog():
    db = SessionLocal()
    try:
        items = db.query(ChecklistCatalog).order_by(ChecklistCatalog.order_index).all()
        print(f"Total items in catalog: {len(items)}")
        for item in items:
            print(f"[{item.item_type}] {item.code}: {item.label} (Parent: {item.parent_id})")
    finally:
        db.close()

if __name__ == "__main__":
    check_catalog()
