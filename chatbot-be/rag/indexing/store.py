import uuid
import chromadb
from configs import CHROMA_DB_HOST, CHROMA_DB_PORT, CHROMA_DB_TOKEN
from chromadb.config import Settings


INDEX_NAME = "SaaSRAG"

chroma_client = None



def init_ChromaDB():
    global chroma_client
    if chroma_client is not None:
        print("ChromaDB already initialized")
        return chroma_client
    print("Initializing ChromaDB")
    chroma_client = chromadb.HttpClient(
        host=CHROMA_DB_HOST,
        port=int(CHROMA_DB_PORT),
        ssl=int(CHROMA_DB_PORT) == 443,
        settings=Settings(
            chroma_client_auth_provider="chromadb.auth.token_authn.TokenAuthClientProvider",
            chroma_client_auth_credentials=CHROMA_DB_TOKEN,
            anonymized_telemetry=False,
        ),
    )
    return chroma_client
def get_collection():
    global chroma_client
    if chroma_client is None:
        print("ChromaDB not initialized, initializing...")
        chroma_client = init_ChromaDB()
    return chroma_client.get_or_create_collection(name=INDEX_NAME)

def add_to_store(documents):
    collection = get_collection()
    collection.add(
        ids=[str(uuid.uuid4()) for _ in range(len(documents))],
        documents=[doc.page_content for doc in documents],
        metadatas=[doc.metadata for doc in documents],
    )


def query_collection(query, k=2):
    collection = get_collection()
    results = collection.query(
        query_texts=[query],
        n_results=k,
        include=[
            "documents",
            "metadatas",
            "distances",
        ],
    )
    return results
