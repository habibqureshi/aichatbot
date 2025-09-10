import uuid
import chromadb
from configs import CHROMA_DB_HOST, CHROMA_DB_PORT

chroma_client = chromadb.HttpClient(host=CHROMA_DB_HOST, port=int(CHROMA_DB_PORT))
INDEX_NAME = "SaaSRAG"
collection = chroma_client.get_or_create_collection(name=INDEX_NAME)
print("connected to chromadb")


def add_to_store(documents):
    collection.add(
        ids=[str(uuid.uuid4()) for _ in range(len(documents))],
        documents=[doc.page_content for doc in documents],
        metadatas=[doc.metadata for doc in documents],
    )
    return collection


def query_collection(query, k=2):
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
