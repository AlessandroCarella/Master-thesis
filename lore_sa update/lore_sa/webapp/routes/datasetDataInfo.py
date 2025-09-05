# routes/dataset.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import numpy as np
import pandas as pd

from pythonHelpers.datasets import get_available_datasets, get_dataset_information, load_dataset
from pythonHelpers.routes.state import global_state

router = APIRouter(prefix="/api")

@router.get("/get-datasets")
async def get_datasets():
    """
    Retrieve a list of available datasets.
    """
    return {"datasets": get_available_datasets()}
    
@router.get("/get-dataset-info/{dataset_name_info}")
async def get_dataset_info(dataset_name_info: str):
    """
    Retrieve detailed information about a specific dataset.
    """
    dataset_info = get_dataset_information(dataset_name_info)
    
    # Update global state
    global_state.dataset_name = dataset_info["name"]
    global_state.target_names = dataset_info["target_names"]
    global_state.target_names.sort()

    return dataset_info
    
def process_tabular_dataset(ds, feature_names):
    """Process tabular dataset and return a JSON response."""
    df = pd.DataFrame(ds.data, columns=feature_names)
    if hasattr(ds, "target"):
        df["target"] = ds.target

    # Clean the dataframe to make it JSON serializable
    # Replace NaN and infinite values with None
    df = df.replace([np.inf, -np.inf], None)

    return JSONResponse(content={"dataset": df.to_dict(orient="records")})

@router.get("/get-selected-dataset")
async def get_selected_dataset():
    """Return the currently selected dataset."""
    ds, feature_names, target_names = load_dataset(global_state.dataset_name)
    global_state.feature_names = feature_names  # Update state
    
    return process_tabular_dataset(ds, feature_names)
