# routes/dataset.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import logging
import pandas as pd

from pythonHelpers.datasets import get_available_datasets, get_dataset_information, load_dataset, DATASETS
from pythonHelpers.routes.state import global_state

router = APIRouter(prefix="/api")

@router.get("/get-datasets")
async def get_datasets():
    """
    Retrieve a list of available datasets.
    """
    try:
        return {"datasets": get_available_datasets()}
    except Exception as e:
        logging.error(f"Error retrieving datasets: {str(e)}")
        return JSONResponse(content={"error": f"Error retrieving datasets: {str(e)}"}, status_code=500)

@router.get("/get-dataset-info/{dataset_name_info}")
async def get_dataset_info(dataset_name_info: str):
    """
    Retrieve detailed information about a specific dataset.
    """
    try:
        if not dataset_name_info:
            return JSONResponse(content={"error": "Dataset name is required"}, status_code=400)
            
        if dataset_name_info not in DATASETS:
            return JSONResponse(
                content={"error": f"Dataset '{dataset_name_info}' not found. Available datasets: {list(DATASETS.keys())}"},
                status_code=400
            )
            
        dataset_info = get_dataset_information(dataset_name_info)
        
        if "error" in dataset_info:
            return JSONResponse(content=dataset_info, status_code=400)

        # Update global state
        global_state.dataset_name = dataset_info["name"]
        global_state.target_names = dataset_info["target_names"]

        return dataset_info
    except Exception as e:
        logging.error(f"Error retrieving dataset info for {dataset_name_info}: {str(e)}")
        return JSONResponse(content={"error": f"Error retrieving dataset info: {str(e)}"}, status_code=500)

def process_tabular_dataset(ds, feature_names):
    """Process tabular dataset and return a JSON response."""
    try:
        df = pd.DataFrame(ds.data, columns=feature_names)
        if hasattr(ds, "target"):
            df["target"] = ds.target
        return JSONResponse(content={"dataset": df.to_dict(orient="records")})
    except Exception as e:
        logging.error(f"Error processing tabular dataset: {str(e)}")
        raise RuntimeError(f"Error processing tabular dataset: {str(e)}")

@router.get("/get-selected-dataset")
async def get_selected_dataset():
    """Return the currently selected dataset."""
    try:
        if not global_state.dataset_name:
            return JSONResponse(content={"error": "No dataset selected."}, status_code=400)
            
        try:
            ds, feature_names, target_names = load_dataset(global_state.dataset_name)
            global_state.feature_names = feature_names  # Update state
            
            return process_tabular_dataset(ds, feature_names)
        except ValueError as e:
            return JSONResponse(content={"error": str(e)}, status_code=400)
        except RuntimeError as e:
            return JSONResponse(content={"error": str(e)}, status_code=500)
        except Exception as e:
            logging.error(f"Error loading selected dataset: {str(e)}")
            return JSONResponse(content={"error": f"Error loading dataset: {str(e)}"}, status_code=500)
    except Exception as e:
        logging.error(f"Unexpected error in get_selected_dataset: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)
