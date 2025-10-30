import os
from dotenv import load_dotenv

load_dotenv()

# ChromaDB Configuration
CHROMA_DB_HOST = os.getenv("CHROMA_DB_HOST", "localhost")
CHROMA_DB_PORT = os.getenv("CHROMA_DB_PORT", "8000")

# RAG Configuration
RAG_COLLECTION_NAME = os.getenv("RAG_COLLECTION_NAME", "SaaSRAG")
RAG_DEFAULT_K = int(os.getenv("RAG_DEFAULT_K", "3"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB = os.getenv("DB_NAME", "test")
MCP_URL = os.getenv("MCP_URL", "http://localhost:8002/mcp")
