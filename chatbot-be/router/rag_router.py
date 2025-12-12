from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from rag.indexing.index import index_file_from_stream
from services import cloud_storage_service, knowledge_service
from uuid import uuid4 as uuid
from db.db import get_db
from schemas.common import PaginatedResponse
from schemas.knowledge import Knowledge

router = APIRouter(
    prefix="/api/v1/rag",  # Prefix for all user-related routes
    tags=["ai_rag"],  # Tag for grouping these routes in the docs
)


@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
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
                status_code=400, detail="Only .txt, .pdf, and .csv files are allowed."
            )
        filename = f"{str(uuid())}.{ext}"
        try:
            await knowledge_service.create(
                name=file.filename, blob_name=filename, db=db
            )
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=400, detail="Knowledge with same name already exist"
            )
        cloud_storage_service.upload_file(file=file, filename=f"knowledge/{filename}")
        await file.seek(0)
        await index_file_from_stream(file, index_name=filename)
        # Here you can process the file as needed, e.g., save to disk, index, etc.
        # For demonstration, we'll just return the filename and size.
        return JSONResponse(
            content={
                "filename": file.filename,
                "content_type": file.content_type,
                "message": "File received successfully.",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.get("/", response_model=PaginatedResponse[Knowledge])
async def get(
    db: AsyncSession = Depends(get_db), page: int = 1, limit: int = Query(10, le=100)
):
    return await knowledge_service.get(db=db, page=page, limit=limit)


# @router.patch("/activate/{knowledge_id}")
# async def activate_knowledge(knowledge_id: int, db: AsyncSession = Depends(get_db)):
#     await knowledge_service.activate_knowledge(db=db, knowledge_id=knowledge_id)
#     return {"message": "Knowledge activated successfully."}


# @router.get("/activate")
# async def get_active_knowledge(db: AsyncSession = Depends(get_db)):
#     knowledge = await knowledge_service.get_active_knowledge(db=db)
#     if not knowledge:
#         raise HTTPException(status_code=404, detail="No active knowledge found.")
#     return knowledge


@router.get("/{knowledge_id}/link")
async def generate_knowledge_link(
    knowledge_id: int, db: AsyncSession = Depends(get_db)
):
    knowledge = await db.get(Knowledge, knowledge_id)
    if not knowledge:
        raise HTTPException(status_code=400, detail="Knowledge not found.")
    link = cloud_storage_service.generate_presigned_url(
        f"knowledge/{knowledge.blob_name}", expiration=600
    )
    return link


@router.delete("/{knowledge_id}")
async def delete_knowledge(knowledge_id: int, db: AsyncSession = Depends(get_db)):
    return await knowledge_service.delete_knowledge(knowledge_id, db)
