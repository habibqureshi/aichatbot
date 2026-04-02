from src.configs import (
    CHROMA_DB_HOST,
    CHROMA_DB_PORT,
    CHROMA_INDEX_NAME,
    CHROMA_DB_TOKEN,
)
import chromadb
from fastmcp import Context, FastMCP
from chromadb.config import Settings

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
    print(f"Getting collection {CHROMA_INDEX_NAME}")
    global chroma_client
    if chroma_client is None:
        print("ChromaDB not initialized, initializing...")
        chroma_client = init_ChromaDB()
    return chroma_client.get_or_create_collection(name=CHROMA_INDEX_NAME)


def register_tools(mcp: FastMCP):
    @mcp.tool(tags=["common"])
    def knowledge_retriever(query: str, ctx: Context, k: int = 3) -> list[str]:
        """
        Retrieve information from the knowledge base using a RAG (Retrieval-Augmented Generation) approach.

        This tool performs a semantic search to find the most relevant documents and returns
        their content to help answer user queries.

        Args:
            query (str): The user’s search query.
            k (int, optional): The maximum number of relevant documents to retrieve. Defaults to 3.

        Returns:
            str: A summarized string containing the most relevant information from the knowledge base.
        """
        try:
            collection = get_collection()
            # Retrieve relevant documents from the knowledge base
            results = collection.query(
                query_texts=[query],
                where={"tenant_id": int(ctx.get_state("tenant_id"))},
                n_results=k,
                include=[
                    "documents",
                    "metadatas",
                    "distances",
                ],
            )
            if (
                not results
                or not results.get("documents")
                or not results["documents"][0]
            ):
                return []

            # Format the results
            documents = results["documents"][0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0]

            formatted_results = []
            for i, (doc, metadata, distance) in enumerate(
                zip(documents, metadatas, distances)
            ):
                result_text = f"Document {i+1} (Relevance: {1-distance:.2f}):\n{doc}\n"
                if metadata:
                    result_text += f"Source: {metadata.get('source', 'Unknown')}\n"
                formatted_results.append(result_text)
            return formatted_results

        except Exception as e:
            return [f"Error searching knowledge base: {str(e)}"]
