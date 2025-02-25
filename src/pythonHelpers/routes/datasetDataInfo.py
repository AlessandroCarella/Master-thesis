# routes/dataset.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from pythonHelpers.datasets import get_available_datasets, get_dataset_information, load_dataset, DATASETS
from pythonHelpers.routes.state import global_state
from pythonHelpers.datasetDataInfoUtils import process_image_dataset, process_tabular_dataset

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
    global_state.dataset_type = dataset_info["dataset_type"]
    if (global_state.dataset_type == "image"):
        global_state.possible_image_sizes = dataset_info["possible_image_sizes"]

    return dataset_info

@router.get("/get-selected-dataset")
async def get_selected_dataset():
    """Return the currently selected dataset."""
    if not global_state.dataset_name:
        return JSONResponse(content={"error": "No dataset selected."}, status_code=400)
    try:
        ds, feature_names, target_names = load_dataset(global_state.dataset_name)
        global_state.feature_names = feature_names  # Update state
        
        if global_state.dataset_type == "image":
            return process_image_dataset(ds, feature_names, target_names)
        
        return process_tabular_dataset(ds, feature_names)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)
