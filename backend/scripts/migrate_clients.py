"""One-time backfill: create a Client row for every existing Project that
doesn't have one yet, using contact_phone/site_name from its data blob.

Safe to run multiple times — projects that already have client_id are skipped.
Run from backend/: python3 scripts/migrate_clients.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal, Base, engine
from app.models import Project, Client
from app.auth import ensure_seed_admin


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_seed_admin(db)

        migrated = 0
        for project in db.query(Project).filter(Project.client_id.is_(None)).all():
            data = project.data or {}
            name = data.get("site_name") or project.name or "Unnamed Client"
            client = Client(
                name=name,
                phone=data.get("contact_phone"),
            )
            db.add(client)
            db.flush()  # get client.id
            project.client_id = client.id
            migrated += 1

        db.commit()
        print(f"Migrated {migrated} project(s) into new Client records.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
