from dotenv import load_dotenv
from fastapi import UploadFile
from langchain_google_community.gcs_file import GCSFileLoader
import os
from langchain.schema import Document

load_dotenv()

project_id = os.getenv("GCP_PROJECT_ID", "")
bucket_name = os.getenv("GCS_BUCKET_NAME", "")


def load_gcs_file(blob_path: str) -> list:
    try:
        loader = GCSFileLoader(
            project_name=project_id, bucket=bucket_name, blob=blob_path
        )
        documents = loader.load()
        return documents
    except Exception as e:
        print(f"Failed to load GCS file: {e}")
        raise


def load_local_txt_file(file_path: str) -> list:
    """
    Loads a local .txt file and returns its content as a list of Document objects
    with 'page_content' and 'metadata' fields, similar to GCSFileLoader output.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            name = f.name
        doc = Document(page_content=content, metadata={"source": name})
        return [doc]
    except Exception as e:
        print(f"Failed to load local txt file: {e}")
        raise


async def load_file_from_stream(f: UploadFile) -> list:
    """
    Loads a local .txt file and returns its content as a list of Document objects
    with 'page_content' and 'metadata' fields, similar to GCSFileLoader output.
    """
    try:
        print(f.filename)
        content = await f.read()
        print(content)
        name = f.filename
        doc = Document(page_content=content, metadata={"source": name})
        return [doc]
    except Exception as e:
        print(f"Failed to load local txt file: {e}")
        raise