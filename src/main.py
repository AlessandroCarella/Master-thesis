# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from pythonHelpers.datasets import get_available_datasets, get_dataset_information
from pythonHelpers.model import get_available_classifiers, train_model_with_lore
from pythonHelpers.visualization import get_tree_visualization, get_pca_visualization

app = FastAPI()

# Allow specified origins
origins = [
    "http://localhost:8080",
    "http://192.168.1.191:8080",
]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bbox = None
descriptor = None
class TrainingRequest(BaseModel):
    dataset: str
    classifier: str
    parameters: Dict[str, Any]

@app.get("/api/get-datasets")
async def get_datasets():
    """Get list of available datasets"""
    return {"datasets": get_available_datasets()}

@app.get("/api/get-classifiers")
async def get_classifiers():
    """Get list of available classifiers and their parameters"""
    return {"classifiers": get_available_classifiers()}

@app.get("/api/get-dataset-info/{dataset_name}")
async def get_dataset_info(dataset_name: str):
    """Get information about a specific dataset"""
    return get_dataset_information(dataset_name)

@app.post("/api/train-model")
async def train_model(request: TrainingRequest):
    """Train a model using specified dataset and classifier"""
    global bbox
    global descriptor
    bbox, descriptor = train_model_with_lore(request.dataset, request.classifier, request.parameters)
    return {
        "status": "success",
        "message": "Model trained successfully",
        "descriptor": descriptor,
    }

@app.get("/api/tree_data")
async def get_tree_data():
    """Get current tree visualization data"""
    return get_tree_visualization()

@app.get("/api/pca-data")
async def get_pca_data():
    """Get current PCA visualization data"""
    return get_pca_visualization()

@app.get("/api/get-dataset")
async def get_mock_dataset():
    """Get a mock dataset"""
    return {"dataset": {}}

@app.get("/api/get-df-features")
async def get_df_features():
    return ["Feature 1", "Feature 2", "Feature 3"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)