import os
from dotenv import load_dotenv

load_dotenv()

# ChromaDB Configuration
CHROMA_DB_HOST = os.getenv("CHROMA_DB_HOST", "localhost")
CHROMA_DB_PORT = os.getenv("CHROMA_DB_PORT", "8000")
CHROMA_DB_TOKEN = os.getenv("CHROMA_DB_TOKEN", "random")

# RAG Configuration
RAG_COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "SaaSRAG")
RAG_DEFAULT_K = int(os.getenv("RAG_DEFAULT_K", "3"))
DB_USER = os.getenv("DB_USER", "root")
INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME", "empty")
USE_CLOUD_SQL = os.getenv("USE_CLOUD_SQL", "false")
DB_PASS = os.getenv("DB_PASS", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB = os.getenv("DB_NAME", "test")
MCP_URL = os.getenv("MCP_URL", "http://localhost:8002/mcp")
BUCKET_NAME = os.getenv("BUCKET_NAME", "rag")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
# JWT / Auth
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "please-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY",   "sk-lf-7c9b1181-280c-43ae-8f8c-ad44e1dc5f6d")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-40384b65-3977-4e37-b0b0-06fa59fa9ff7")
LANGFUSE_BASE_URL = os.getenv("LANGFUSE_BASE_URL", "http://localhost:3000")