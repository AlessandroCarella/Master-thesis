# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pythonHelpers.routes.health import router as health_router
from pythonHelpers.routes.datasetDataInfo import router as dataset_router
from pythonHelpers.routes.model import router as model_router
from pythonHelpers.routes.explain import router as explain_router

app = FastAPI()

# Allowed origins for CORS
origins = [
    "http://localhost:8080",
    "http://192.168.1.191:8080",
]

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
