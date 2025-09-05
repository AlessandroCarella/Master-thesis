# routes/model.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from fastapi.responses import JSONResponse

from ..model import get_available_classifiers, train_model_with_lore
from ..datasets import DATASETS
from .state import global_state

router = APIRouter(prefix="/api")

@router.get("/get-classifiers")
async def get_classifiers():
    """
    Retrieve available classifiers and their parameters.
    """
    return {"classifiers": get_available_classifiers()}

class TrainingRequest(BaseModel):
    dataset_name: str
    classifier: str
    parameters: Dict[str, Any]

@router.post("/train-model")
async def train_model(request: TrainingRequest):
    """
    Train a model with the given dataset and classifier.
    """    
    # Train the model and update the global state.
    global_state.bbox, global_state.dataset, global_state.feature_names = train_model_with_lore(
        request.dataset_name, request.classifier, request.parameters
    )
    global_state.descriptor = global_state.dataset.descriptor

    return {
        "status": "success",
        "message": "Model trained successfully",
        "descriptor": global_state.descriptor,
    }
