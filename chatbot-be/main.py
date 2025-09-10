
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from router import chatbot_router, rag_router
from graph import bot_graph
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    lifespan=bot_graph.lifespan,
    docs_url="/ai/docs",
    openapi_url="/ai/openapi.json"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # your React/Next.js app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(chatbot_router.router)
app.include_router(rag_router.router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": [
                {
                    "field": error["loc"][1] if len(error["loc"]) > 1 else error["loc"][0],
                    "message": error["msg"]
                }
                for error in exc.errors()
            ],
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
