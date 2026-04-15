import sys
import os
from sqlalchemy import create_engine, text

# Database connection for superuser (postgres)
# Assuming defaults from docker-compose
DATABASE_URL = "postgresql://postgres:password@localhost/app"

def create_app_user():
    engine = create_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        try:
            # Check if user exists
            result = conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname='app_user'"))
            if result.fetchone():
                print("User app_user already exists.")
                # Update password just in case
                conn.execute(text("ALTER USER app_user WITH PASSWORD 'app_password'"))
            else:
                print("Creating user app_user...")
                conn.execute(text("CREATE USER app_user WITH PASSWORD 'app_password'"))
            
            # Grant privileges
            print("Granting privileges...")
            conn.execute(text("GRANT CONNECT ON DATABASE app TO app_user"))
            conn.execute(text("GRANT USAGE ON SCHEMA public TO app_user"))
            conn.execute(text("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user"))
            conn.execute(text("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user"))
            conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user"))
            conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user"))
            
            print("Done.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    create_app_user()
