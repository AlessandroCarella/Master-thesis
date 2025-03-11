# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os

# Configure logging
from pythonHelpers.logging_config import configure_logging
configure_logging()

from pythonHelpers.routes.health import router as health_router
from pythonHelpers.routes.datasetDataInfo import router as dataset_router
from pythonHelpers.routes.model import router as model_router
from pythonHelpers.routes.explain import router as explain_router
from pythonHelpers.routes.colors import router as colors_router

app = FastAPI()

# Allowed origins for CORS - make configurable through environment variables
origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:8080,http://192.168.1.191:8080").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred. Please check the server logs."},
    )

# Include routers from separate modules
app.include_router(health_router)
app.include_router(dataset_router)
app.include_router(model_router)
app.include_router(explain_router)
app.include_router(colors_router)

@app.on_event("startup")
async def startup_event():
    logging.info("Application starting up")
    # Create cache directory if it doesn't exist
    os.makedirs("cache", exist_ok=True)

@app.on_event("shutdown")
async def shutdown_event():
    logging.info("Application shutting down")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
