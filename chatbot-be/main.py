from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from router import (
    appointment_crud_router,
    appointment_router,
    chatbot_router,
    conversation_router,
    doctor_router,
    call_stats_router,
    rag_router,
    app_setting_router,
    speciality_router,
    restaurant_router,
    auth_router,
)
from graph import bot_graph
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    lifespan=bot_graph.lifespan,
    docs_url="/ai/docs",
    openapi_url="/ai/openapi.json",
    redirect_slashes=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://chatbot-fe-652968847102.us-central1.run.app",
        "https://dashboard.callsynthra.com",
    ],  # your React/Next.js app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.callsynthra\.com",
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(chatbot_router.router)
app.include_router(rag_router.router)
app.include_router(appointment_router.router)
app.include_router(conversation_router.router)
app.include_router(doctor_router.router)
app.include_router(appointment_crud_router.router)
app.include_router(app_setting_router.router)
app.include_router(speciality_router.router)
app.include_router(call_stats_router.router)
app.include_router(restaurant_router.router)
app.include_router(auth_router.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": [
                {
                    "field": (
                        error["loc"][1] if len(error["loc"]) > 1 else error["loc"][0]
                    ),
                    "message": error["msg"],
                }
                for error in exc.errors()
            ],
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        forwarded_allow_ips="*",
        proxy_headers=True,
    )
