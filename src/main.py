# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Include routers from separate modules
app.include_router(health_router)
app.include_router(dataset_router)
app.include_router(model_router)
app.include_router(explain_router)
app.include_router(colors_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
