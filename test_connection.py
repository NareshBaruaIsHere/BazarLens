# test_connection.py
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

print("URL found:", repr(DATABASE_URL))

print("Trying to connect...")  # add this so we know it's even running
print("URL found:", DATABASE_URL is not None)  # sanity check .env loaded

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Connected successfully!")
    conn.close()
except Exception as e:
    print("Connection failed:")
    print(e)