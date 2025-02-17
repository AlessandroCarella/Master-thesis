# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from pythonHelpers.datasets import get_available_datasets, get_dataset_information
from pythonHelpers.model import get_available_classifiers, train_model_with_lore
from pythonHelpers.visualization import get_tree_visualization, get_pca_visualization
from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import generate_decision_tree_visualization_data, extract_tree_structure
from pythonHelpers.generate_pca_visualization_data import generate_pca_visualization_data

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
dataset = None
dataset_name = None
feature_names = None
target_names = None

class TrainingRequest(BaseModel):
    dataset_name: str
    classifier: str
    parameters: Dict[str, Any]

class InstanceRequest(BaseModel):
    instance: Dict[str, Any]
    dataset_name: str
    neighbourhood_size: int
    PCAstep: float
    
@app.get("/api/get-datasets")
async def get_datasets():
    """Get list of available datasets"""
    return {"datasets": get_available_datasets()}

@app.get("/api/get-classifiers")
async def get_classifiers():
    """Get list of available classifiers and their parameters"""
    return {"classifiers": get_available_classifiers()}

@app.get("/api/get-dataset-info/{dataset_name_info}")
async def get_dataset_info(dataset_name_info: str):
    """Get information about a specific dataset"""
    dataset_info = get_dataset_information(dataset_name_info)

    global dataset_name
    dataset_name = dataset_info["name"]
    global feature_names
    feature_names = dataset_info["feature_names"]
    global target_names
    target_names = dataset_info["target_names"]

    return dataset_info

@app.post("/api/train-model")
async def post_train_model(request: TrainingRequest):
    """Train a model using specified dataset and classifier"""
    global bbox
    global descriptor
    global dataset

    bbox, dataset = train_model_with_lore(request.dataset_name, request.classifier, request.parameters)
    descriptor = dataset.descriptor

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

@app.post("/api/explain")
async def post_explain_instance(request: InstanceRequest):
    """Explain the instance requested"""
    global bbox
    global descriptor
    global dataset
    global feature_names
    global target_names
    global dataset_name

    # Convert the instance dictionary to a list of values in the correct order
    instance_values = [request.instance[feature] for feature in feature_names]

    neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
        instance=instance_values,  # Pass the ordered list of values
        bbox=bbox,
        dataset=dataset,
        neighbourhood_size=request.neighbourhood_size,
    )

    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighbourood,
        neighb_train_yz=neighb_train_yz
    )

    decisionTreeVisualizationData = generate_decision_tree_visualization_data(
        extract_tree_structure(
            tree_classifier=dt_surr,
            feature_names=feature_names,
            target_names=target_names
        )
    )

    PCAvisualizationData = generate_pca_visualization_data(
        feature_names=feature_names,
        X=neighb_train_X,
        y=neighb_train_y,
        pretrained_tree=dt_surr,
        step=request.PCAstep
    )
    
    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": decisionTreeVisualizationData,
        "PCAvisualizationData": PCAvisualizationData
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)