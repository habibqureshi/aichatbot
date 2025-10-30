import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_DB_HOST = os.getenv("CHROMA_DB_HOST", "localhost")
CHROMA_DB_PORT = os.getenv("CHROMA_DB_PORT", 8000)
CHROMA_INDEX_NAME = os.getenv("CHROMA_INDEX_NAME", "SaaSRAG")
CHROMA_DB_AUTHN_TOKEN = os.getenv("CHROMA_DB_AUTHN_TOKEN", "random-token")

PORT = int(os.getenv("PORT", 8000))
