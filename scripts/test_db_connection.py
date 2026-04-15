from sqlalchemy import create_engine, text
from app.core.config import settings

def test_connection():
    uri = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"Connecting to: {uri.replace('app_password', '***')}")
    
    engine = create_engine(uri)
    try:
        with engine.connect() as conn:
            print("Connected successfully!")
            
            # Test schema access
            result = conn.execute(text("SELECT schema_name FROM information_schema.schemata"))
            print("Schemas:", [r[0] for r in result])
            
            # Test table access
            result = conn.execute(text("SELECT * FROM users LIMIT 1"))
            print("User count:", result.rowcount)
            print("Row:", result.fetchone())
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
