import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url and raw_db_url.startswith("postgresql"):
    database_url = raw_db_url
else:
    database_url = "sqlite:///./bazarlens.db"

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)


def test_connection():
    query = "SELECT sqlite_version()" if database_url.startswith("sqlite") else "SELECT version()"
    with engine.connect() as connection:
        result = connection.execute(text(query)).scalar()
        return {"database_url": database_url, "result": result}
