# routes/model.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from fastapi.responses import JSONResponse

from pythonHelpers.model import get_available_classifiers, train_model_with_lore
from pythonHelpers.datasets import DATASETS
from pythonHelpers.routes.state import global_state

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
    try:
        # Validate request
        if not request.dataset_name:
            return JSONResponse(content={"error": "Dataset name is required"}, status_code=400)
        
        if request.dataset_name not in DATASETS:
            return JSONResponse(
                content={"error": f"Dataset '{request.dataset_name}' not found. Available datasets: {list(DATASETS.keys())}"},
                status_code=400
            )
            
        if not request.classifier:
            return JSONResponse(content={"error": "Classifier name is required"}, status_code=400)
            
        if request.classifier not in get_available_classifiers():
            return JSONResponse(
                content={"error": f"Classifier '{request.classifier}' not supported. Available classifiers: {list(get_available_classifiers().keys())}"},
                status_code=400
            )
        
        # Train the model and update the global state.
        try:
            global_state.bbox, global_state.dataset, global_state.feature_names = train_model_with_lore(
                request.dataset_name, request.classifier, request.parameters
            )
            global_state.descriptor = global_state.dataset.descriptor
        except ValueError as e:
            return JSONResponse(content={"error": str(e)}, status_code=400)
        except RuntimeError as e:
            return JSONResponse(content={"error": str(e)}, status_code=500)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)

        return {
            "status": "success",
            "message": "Model trained successfully",
            "descriptor": global_state.descriptor,
        }
    except Exception as e:
        import logging
        logging.error(f"Unexpected error in train_model endpoint: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)
