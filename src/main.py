# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any

# Import helper functions from custom modules
from pythonHelpers.datasets import get_available_datasets, get_dataset_information
from pythonHelpers.model import get_available_classifiers, train_model_with_lore
from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import (
    generate_decision_tree_visualization_data,
    extract_tree_structure
)
from pythonHelpers.generate_pca_visualization_data import generate_pca_visualization_data

# Initialize the FastAPI application
app = FastAPI()

# Define allowed origins for CORS
origins = [
    "http://localhost:8080",
    "http://192.168.1.191:8080",
]

# Enable CORS middleware to allow requests from the specified origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store model components and dataset information.
bbox = None
descriptor = None
dataset = None
dataset_name = None
feature_names = None
target_names = None

@app.get("/health")
@app.head("/health")
async def health_check():
    return JSONResponse(content={"status": "ok"})

@app.get("/api/get-datasets")
async def get_datasets():
    """
    GET endpoint to retrieve available datasets.

    Returns:
        dict: A dictionary containing a list of available datasets.
    """
    return {"datasets": get_available_datasets()}

@app.get("/api/get-classifiers")
async def get_classifiers():
    """
    GET endpoint to retrieve available classifiers and their parameters.

    Returns:
        dict: A dictionary containing the classifiers and their configuration details.
    """
    return {"classifiers": get_available_classifiers()}

@app.get("/api/get-dataset-info/{dataset_name_info}")
async def get_dataset_info(dataset_name_info: str):
    """
    GET endpoint to retrieve detailed information about a specific dataset.

    Args:
        dataset_name_info (str): The name of the dataset to fetch information for.

    Returns:
        dict: A dictionary containing dataset details including name, feature names, and target names.
    """
    dataset_info = get_dataset_information(dataset_name_info)

    # Update global dataset metadata for later use in training and explanation
    global dataset_name
    dataset_name = dataset_info["name"]
    global feature_names
    feature_names = dataset_info["feature_names"]
    global target_names
    target_names = dataset_info["target_names"]

    return dataset_info


class TrainingRequest(BaseModel):
    """
    Pydantic model for training requests.

    Attributes:
        dataset_name (str): The name of the dataset to be used.
        classifier (str): The classifier to train.
        parameters (Dict[str, Any]): Additional parameters for the classifier.
    """
    dataset_name: str
    classifier: str
    parameters: Dict[str, Any]

@app.post("/api/train-model")
async def post_train_model(request: TrainingRequest):
    """
    POST endpoint to train a model using the specified dataset and classifier.

    Args:
        request (TrainingRequest): The training request containing dataset name, classifier, and parameters.

    Returns:
        dict: A dictionary indicating the status of the training process, a message, and the dataset descriptor.
    """
    global bbox
    global descriptor
    global dataset

    # Train the model using the specified dataset, classifier, and parameters
    bbox, dataset = train_model_with_lore(request.dataset_name, request.classifier, request.parameters)
    descriptor = dataset.descriptor

    return {
        "status": "success",
        "message": "Model trained successfully",
        "descriptor": descriptor,
    }

class InstanceRequest(BaseModel):
    """
    Pydantic model for instance explanation requests.

    Attributes:
        instance (Dict[str, Any]): The instance features provided as a dictionary.
        dataset_name (str): The name of the dataset.
        neighbourhood_size (int): The size of the neighbourhood for LIME-like explanations.
        PCAstep (float): The step size for PCA visualization.
    """
    instance: Dict[str, Any]
    dataset_name: str
    neighbourhood_size: int
    PCAstep: float

@app.post("/api/explain")
async def post_explain_instance(request: InstanceRequest):
    """
    POST endpoint to explain a single instance using a surrogate decision tree model.

    Args:
        request (InstanceRequest): The instance request containing:
            - instance (dict): The input instance to explain.
            - dataset_name (str): The name of the dataset.
            - neighbourhood_size (int): The size of the neighbourhood to generate.
            - PCAstep (float): The step size for PCA visualization.

    Returns:
        dict: A dictionary with the explanation results including decision tree visualization data
              and PCA visualization data.
    """
    global bbox
    global descriptor
    global dataset
    global feature_names
    global target_names
    global dataset_name

    print ("request.PCAstep", request.PCAstep)
    print ("request.neighbourhood_size", request.neighbourhood_size)

    # Convert the instance dictionary to a list of values ordered by feature_names
    instance_values = [request.instance[feature] for feature in feature_names]

    # Create a neighbourhood around the instance for local explanation
    neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
        instance=instance_values,  # Ordered list of instance feature values
        bbox=bbox,
        dataset=dataset,
        neighbourhood_size=request.neighbourhood_size,
    )

    # Generate a surrogate decision tree model based on the neighbourhood
    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighbourood,
        neighb_train_yz=neighb_train_yz
    )

    # Extract the decision tree structure and generate visualization data
    decision_tree_structure = extract_tree_structure(
        tree_classifier=dt_surr,
        feature_names=feature_names,
        target_names=target_names
    )
    decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)

    # Generate PCA visualization data for the neighbourhood
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
    # Run the FastAPI application on host 0.0.0.0 and port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
