
from typing import Optional
from fastapi import APIRouter
from langgraph.graph import StateGraph

from rag.indexing.index import index_file_from_stream


router = APIRouter(
    prefix="/api/v1/rag",  # Prefix for all user-related routes
    tags=["ai_rag"],  # Tag for grouping these routes in the docs
)


from fastapi import UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """
    Endpoint to accept a file upload.
    Only .txt, .pdf, and .csv files are allowed.
    """
    allowed_extensions = {".txt", ".pdf", ".csv"}
    try:
        filename = file.filename or ""
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        if f".{ext}" not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Only .txt, .pdf, and .csv files are allowed."
            )
        contents = await index_file_from_stream(file)
        # Here you can process the file as needed, e.g., save to disk, index, etc.
        # For demonstration, we'll just return the filename and size.
        return JSONResponse(
            content={
                "filename": file.filename,
                "content_type": file.content_type,
                "message": "File received successfully."
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
