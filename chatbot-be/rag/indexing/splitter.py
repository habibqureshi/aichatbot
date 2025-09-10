import json
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pydantic import Json


# Configure the splitter
def recursive_split(documents, chunk_size=50, chunk_overlap=10, separators=["\n\n"]):
    """
    Splits the input content into paragraph chunks then converting chunk max 1000 char using RecursiveCharacterTextSplitter.

    Args:
        content (str): The text to split.
        chunk_size (int): The maximum size of each chunk.
        chunk_overlap (int): The number of overlapping characters between chunks.
        separators (list, optional): List of separators to use for splitting.

    Returns:
        list: List of text chunks.
    """
    para_docs = []
    for doc in documents:
        paragraphs = doc.page_content.split("\n\n")  # or use "\n" if paragraphs use single line breaks
    for para in paragraphs:
        clean_para = para.strip()
        if clean_para:
            para_docs.append(Document(page_content=clean_para, metadata=doc.metadata))
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators,
    )
    docs = splitter.split_documents(para_docs)
    return docs
