import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_HOST = os.getenv("CHROMA_DB_HOST", "localhost")
CHROMA_DB_PORT = os.getenv("CHROMA_DB_PORT", 8000)
CHROMA_INDEX_NAME = os.getenv("CHROMA_INDEX_NAME", "SaaSRAG")
CHROMA_DB_TOKEN = os.getenv("CHROMA_DB_TOKEN", "random")
CHROMA_DB_AUTHN_TOKEN = os.getenv("CHROMA_DB_AUTHN_TOKEN", "random-token")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB = os.getenv("DB_NAME", "test")
PORT = int(os.getenv("PORT", 8000))
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
