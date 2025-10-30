from langchain_core.tools import tool
from rag.reteriver.reterive import reterive_from_store


# @tool
def search_knowledge_base(query: str, k: int = 3) -> str:
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
        # Retrieve relevant documents from the knowledge base
        results = reterive_from_store(query, k=k)
        if not results or not results.get("documents") or not results["documents"][0]:
            return "No relevant information found in the knowledge base."

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
        return "\n\n".join(formatted_results)

    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"
