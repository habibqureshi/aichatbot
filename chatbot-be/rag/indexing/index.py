import os
import sys

from fastapi import UploadFile

# Add the project root to Python path if not already present
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from indexing.loader import load_file_from_stream, load_local_txt_file
from indexing.splitter import recursive_split
from indexing.store import add_to_store



async def index_file_from_stream(f: UploadFile):
    try:
        documents = await load_file_from_stream(f)
        split_chunks = recursive_split(documents, chunk_size=1000, chunk_overlap=200)
        return add_to_store(split_chunks)
    except Exception as e:
        print(f"Error in index_file_from_stream: {e}")
        raise