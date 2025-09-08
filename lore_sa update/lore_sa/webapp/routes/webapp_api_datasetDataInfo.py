from typing import Dict, Any, List
import numpy as np
import pandas as pd
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..webapp_datasets import get_available_datasets, get_dataset_information, load_dataset
from .webapp_api_state import webapp_state
from .webapp_api_utils import safe_json_response

router = APIRouter(prefix="/api")


@router.get("/get-datasets")
async def get_datasets() -> Dict[str, List[str]]:
    """
    Retrieve list of available datasets for model training.
    
    Returns
    -------
    Dict[str, List[str]]
        Dictionary containing list of available dataset names.
    """
    available_datasets = get_available_datasets()
    dataset_names = list(available_datasets.keys())
    return safe_json_response({"datasets": dataset_names})
    

@router.get("/get-dataset-info/{dataset_name_info}")
async def get_dataset_info(dataset_name_info: str) -> Dict[str, Any]:
    """
    Retrieve metadata information for a specified dataset.
    
    Parameters
    ----------
    dataset_name_info : str
        Name of the dataset to get information about.
        
    Returns
    -------
    Dict[str, Any]
        Dataset metadata including feature names, target names, and sample count.
        
    Notes
    -----
    Updates webapp_state with dataset name and target information.
    """
    dataset_info = get_dataset_information(dataset_name_info)
    
    webapp_state.dataset_name = dataset_info["name"]
    webapp_state.target_names = dataset_info["target_names"]
    webapp_state.target_names.sort()

    return safe_json_response(dataset_info)
    

def process_tabular_dataset(ds: Any, feature_names: List[str]) -> JSONResponse:
    """
    Convert tabular dataset to JSON-serializable format.
    
    Parameters
    ----------
    ds : Any
        Dataset object with data and target attributes.
    feature_names : List[str]
        Names of the feature columns.
        
    Returns
    -------
    JSONResponse
        JSON response containing dataset records.
        
    Notes
    -----
    Handles NaN and infinite values by replacing with None for JSON compatibility.
    Converts dataset to list of record dictionaries for frontend consumption.
    """
    df = pd.DataFrame(ds.data, columns=feature_names)
    if hasattr(ds, "target"):
        df["target"] = ds.target

    df = df.replace([np.inf, -np.inf], None)

    return JSONResponse(content={"dataset": df.to_dict(orient="records")})


@router.get("/get-selected-dataset")
async def get_selected_dataset() -> JSONResponse:
    """
    Load and return the currently selected dataset.
    
    Returns
    -------
    JSONResponse
        Dataset in tabular format ready for frontend display.
        
    Notes
    -----
    Updates webapp_state with feature names from the loaded dataset.
    Requires that webapp_state.dataset_name has been set by previous calls.
    """
    ds, feature_names, target_names = load_dataset(webapp_state.dataset_name)
    webapp_state.feature_names = feature_names
    
    return safe_json_response(process_tabular_dataset(ds, feature_names))
