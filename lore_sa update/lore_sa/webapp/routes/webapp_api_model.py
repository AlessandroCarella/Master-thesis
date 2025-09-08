from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import JSONResponse

from ..webapp_model import get_available_classifiers, train_model_with_lore
from ..webapp_datasets import DATASETS
from .webapp_api_state import webapp_state
from .webapp_api_utils import safe_json_response

router = APIRouter(prefix="/api")


class TrainingRequest(BaseModel):
    """
    Request model for machine learning model training.
    
    Attributes
    ----------
    dataset_name : str
        Name of the dataset to use for training.
    classifier : str
        Type of classifier to train.
    parameters : Dict[str, Any]
        Hyperparameters for the classifier.
    """
    dataset_name: str
    classifier: str
    parameters: Dict[str, Any]


@router.get("/get-classifiers")
async def get_classifiers() -> Dict[str, Any]:
    """
    Retrieve available machine learning classifiers.
    
    Returns
    -------
    Dict[str, Any]
        Dictionary containing available classifiers and their configurations.
    """
    return safe_json_response({"classifiers": get_available_classifiers()})


@router.post("/train-model")
async def train_model(request: TrainingRequest) -> Dict[str, Any]:
    """
    Train a machine learning model with specified parameters.
    
    Parameters
    ----------
    request : TrainingRequest
        Training configuration including dataset, classifier, and parameters.
        
    Returns
    -------
    Dict[str, Any]
        Training status and model descriptor information.
        
    Notes
    -----
    Updates global webapp_state with trained model artifacts.
    """
    webapp_state.reset_explanation_components()

    webapp_state.bbox, webapp_state.dataset, webapp_state.feature_names = train_model_with_lore(
        request.dataset_name, request.classifier, request.parameters
    )
    webapp_state.descriptor = webapp_state.dataset.descriptor

    return safe_json_response({
        "status": "success",
        "message": "Model trained successfully",
        "descriptor": webapp_state.descriptor,
    })
