"""
LangChain tool for knowledge retrieval via ChromaDB – runs directly against
the local ChromaDB instance (no MCP round-trip).  Uses the same collection
as ``rag/indexing/store.py``.
"""
from __future__ import annotations

from logging import Logger
from typing import Any

from langchain_core.tools import tool

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:  # pragma: no cover
    _get_stream_writer = None  # type: ignore[misc, assignment]

from rag.indexing.store import get_collection


def _emit(payload: dict[str, Any], log: Logger) -> None:
    sw_status = "skipped"
    if _get_stream_writer is not None:
        try:
            writer = _get_stream_writer()
            if writer is not None:
                writer({"type": "order_mcp_tool", **payload})
                sw_status = "ok"
            else:
                sw_status = "no_op_writer"
        except Exception as e:
            sw_status = f"exc:{type(e).__name__}"
    else:
        sw_status = "import_missing"
    log.info(
        "RETRIEVER_TOOL_PROGRESS | tool=%s phase=%s stream_writer=%s",
        payload.get("tool"),
        payload.get("phase"),
        sw_status,
    )


def build_retriever_tools(tenant_id: int, log: Logger) -> list:
    """Return a list containing the knowledge_retriever LangChain tool."""

    @tool
    def knowledge_retriever(query: str, k: int = 3) -> list[str]:
        """Retrieve information from the knowledge base using a RAG approach.

        Performs a semantic search to find the most relevant documents and
        returns their content to help answer user queries.

        Args:
            query: The user's search query.
            k: Maximum number of relevant documents to retrieve (default 3).
        """
        _emit({"tool": "knowledge_retriever", "phase": "start"}, log)
        try:
            collection = get_collection()
            results = collection.query(
                query_texts=[query],
                where={"tenant_id": tenant_id},
                n_results=k,
                include=["documents", "metadatas", "distances"],
            )

            if (
                not results
                or not results.get("documents")
                or not results["documents"][0]
            ):
                _emit({"tool": "knowledge_retriever", "phase": "done"}, log)
                return ["No relevant information found in the knowledge base."]

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

            _emit({"tool": "knowledge_retriever", "phase": "done"}, log)
            return formatted_results

        except Exception as e:
            log.exception("knowledge_retriever tool failed: %s", e)
            _emit({"tool": "knowledge_retriever", "phase": "error", "error": str(e)}, log)
            return [f"Error searching knowledge base: {str(e)}"]

    return [knowledge_retriever]
