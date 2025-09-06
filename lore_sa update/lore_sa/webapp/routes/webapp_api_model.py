# routes/model.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from fastapi.responses import JSONResponse

from ..webapp_model import get_available_classifiers, train_model_with_lore
from ..webapp_datasets import DATASETS
from .webapp_api_state import webapp_state
from .webapp_api_utils import safe_json_response

router = APIRouter(prefix="/api")

@router.get("/get-classifiers")
async def get_classifiers():
    """
    Retrieve available classifiers and their parameters.
    """
    return safe_json_response({"classifiers": get_available_classifiers()})

class TrainingRequest(BaseModel):
    dataset_name: str
    classifier: str
    parameters: Dict[str, Any]

@router.post("/train-model")
async def train_model(request: TrainingRequest):
    """
    Train a model with the given dataset and classifier.
    """    
    # Train the model and update the webapp state.
    webapp_state.bbox, webapp_state.dataset, webapp_state.feature_names = train_model_with_lore(
        request.dataset_name, request.classifier, request.parameters
    )
    webapp_state.descriptor = webapp_state.dataset.descriptor

    return safe_json_response({
        "status": "success",
        "message": "Model trained successfully",
        "descriptor": webapp_state.descriptor,
    })
