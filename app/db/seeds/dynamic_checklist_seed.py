import uuid
import sys
import os
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from app.db.session import SessionLocal, engine
from app.db.models.checklist import ChecklistCatalog, AnomalyCatalog

def seed_checklist():
    # Ensure columns exist
    with engine.connect() as conn:
        print("Ensuring columns exist...")
        try:
            conn.execute(text("ALTER TABLE checklist_categories ADD COLUMN IF NOT EXISTS field_type VARCHAR(20) DEFAULT 'BOOL'"))
            conn.execute(text("ALTER TABLE checklist_categories ADD COLUMN IF NOT EXISTS unit VARCHAR(20)"))
            conn.execute(text("ALTER TABLE mission_checklist_results ADD COLUMN IF NOT EXISTS result_value VARCHAR(255)"))
            conn.execute(text("ALTER TABLE mission_checklist_results ADD COLUMN IF NOT EXISTS comment TEXT"))
            conn.commit()
            print("DDL applied.")
        except Exception as e:
            print(f"DDL Error: {e}")

    db = SessionLocal()
    try:
        # 1. Clear existing catalog (optional, but good for clean demo)
        db.execute(text("DELETE FROM mission_checklist_results"))
        db.execute(text("DELETE FROM mission_anomalies"))
        db.query(ChecklistCatalog).delete()
        db.query(AnomalyCatalog).delete()
        db.commit()

        # 2. Sections
        sections = [
            ("I", "GAINE ET CUVETTE", 10),
            ("II", "MACHINERIE ET POULIES", 20),
            ("III", "CABINE", 30),
            ("IV", "CONTREPoids ET EQUILIBRAGE", 40),
            ("V", "SUSPENSION ET PARACHUTES", 50),
            ("VI", "GUIDAGE ET AMORTISSEURS", 60),
            ("VII", "PORTES PALIÈRES", 70),
            ("VIII", "VALEURS D'ESSAIS ET MESURES", 80),
            ("IX", "AUTRES DISPOSITIFS", 90),
        ]

        section_map = {}
        for code, label, order in sections:
            group = ChecklistCatalog(
                id=uuid.uuid4(),
                code=code,
                label=label,
                order_index=order,
                item_type="GROUP",
                field_type="TEXT"
            )
            db.add(group)
            section_map[code] = group.id
        
        db.commit()

        # 3. Items for Section I (Gaine)
        items_i = [
            ("I.1", "Parois de la gaine", "Etat et fixation des parois", 1, "BOOL", None),
            ("I.2", "Ventilation de la gaine", "Présence et efficacité", 2, "BOOL", None),
            ("I.3", "Eclairage de la gaine", "Luminosité minimum", 3, "BOOL", None),
            ("I.4", "Distance de sécurité en cuvette", "Espace de survie", 4, "MEASURE", "mm"),
        ]
        
        # Items for Section VIII (Measurements)
        items_viii = [
            ("VIII.1", "Vitesse nominale", "Vitesse de montée/descente", 1, "MEASURE", "m/s"),
            ("VIII.2", "Temps de trajet total", "Durée entre niveaux", 2, "MEASURE", "s"),
            ("VIII.3", "Charge maximum testée", "Poids lors de l'essai", 3, "MEASURE", "kg"),
        ]

        for code, label, desc, order, ftype, unit in items_i:
            item = ChecklistCatalog(
                code=code,
                label=label,
                description=desc,
                order_index=order,
                item_type="ITEM",
                field_type=ftype,
                unit=unit,
                parent_id=section_map["I"]
            )
            db.add(item)

        for code, label, desc, order, ftype, unit in items_viii:
            item = ChecklistCatalog(
                code=code,
                label=label,
                description=desc,
                order_index=order,
                item_type="ITEM",
                field_type=ftype,
                unit=unit,
                parent_id=section_map["VIII"]
            )
            db.add(item)

        # 4. Anomalies
        anomalies = [
            ("1A", "Parois présentant des aspérités dangereuses", "NORMAL"),
            ("1B", "Ventilation obstruée ou insuffisante", "NORMAL"),
            ("8A", "Vitesse supérieure à 5% de la vitesse nominale", "HIGH"),
        ]
        for acode, adesc, acrit in anomalies:
            anom = AnomalyCatalog(
                code=acode,
                description=adesc,
                criticality=acrit
            )
            db.add(anom)

        db.commit()
        print("Successfully seeded dynamic checklist catalog.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_checklist()
