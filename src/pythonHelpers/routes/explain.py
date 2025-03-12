# routes/explain.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import numpy as np
import logging

from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import (
    generate_decision_tree_visualization_data,
    extract_tree_structure
)
from pythonHelpers.create_scatter_plot_data import create_scatter_plot_data
from pythonHelpers.routes.state import global_state
from pythonHelpers.datasets import DATASETS

router = APIRouter(prefix="/api")

class InstanceRequest(BaseModel):
    instance: Optional[Dict[str, Any]] = None
    dataset_name: str
    neighbourhood_size: int
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"

class VisualizationRequest(BaseModel):
    dataset_name: str
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"

# ---------------- Helper Functions ---------------- #

def validate_dataset(dataset_name: str):
    """Validate that a dataset is provided and exists."""
    if not dataset_name:
        return JSONResponse(content={"error": "Dataset name is required"}, status_code=400)
    if dataset_name not in DATASETS:
        return JSONResponse(
            content={"error": f"Dataset '{dataset_name}' not found. Available datasets: {list(DATASETS.keys())}"},
            status_code=400
        )
    return None

def validate_scatter_plot_method(method: str):
    """Validate that a supported scatter plot method is provided."""
    if not method:
        return JSONResponse(content={"error": "Scatter plot method is required"}, status_code=400)
    if method not in ['pca', 'tsne', 'umap', 'mds']:
        return JSONResponse(
            content={"error": f"Unsupported method: {method}. Use 'pca', 'tsne', 'umap', or 'mds'."},
            status_code=400
        )
    return None

def process_instance(request: InstanceRequest):
    """Process tabular data input."""
    try:
        if not request.instance:
            return JSONResponse(content={"error": "No instance data provided"}, status_code=400)
        if not global_state.feature_names:
            return JSONResponse(content={"error": "No feature names available"}, status_code=400)
        
        # Check if all required features are present
        missing_features = [f for f in global_state.feature_names if f not in request.instance]
        if missing_features:
            return JSONResponse(
                content={"error": f"Missing features in instance: {missing_features}"},
                status_code=400
            )
        return [request.instance[feature] for feature in global_state.feature_names]
    except Exception as e:
        logging.error(f"Error processing instance: {str(e)}")
        return JSONResponse(content={"error": f"Error processing instance: {str(e)}"}, status_code=500)

def generate_scatter_plot(request, feature_names, X, y, surrogate, class_names):
    """Generate scatter plot visualization data using the provided parameters."""
    try:
        return create_scatter_plot_data(
            feature_names=feature_names,
            X=X,
            y=y,
            pretrained_tree=surrogate,
            class_names=class_names,
            step=request.scatterPlotStep,
            method=request.scatterPlotMethod
        )
    except Exception as e:
        logging.error(f"Error creating scatter plot: {str(e)}")
        return JSONResponse(content={"error": f"Error creating scatter plot: {str(e)}"}, status_code=500)

def generate_decision_tree_data(surrogate, feature_names, target_names):
    """Extract and generate decision tree visualization data."""
    try:
        tree_structure = extract_tree_structure(
            tree_classifier=surrogate,
            feature_names=feature_names,
            target_names=target_names
        )
        return generate_decision_tree_visualization_data(tree_structure)
    except Exception as e:
        logging.error(f"Error generating decision tree visualization: {str(e)}")
        return JSONResponse(content={"error": f"Error generating decision tree visualization: {str(e)}"}, status_code=500)

def validate_neighborhood_availability():
    """Validate that neighborhood data exists in the global state."""
    if (global_state.neighborhood is None or 
        global_state.neighb_train_X is None or 
        global_state.neighb_train_y is None or 
        global_state.dt_surrogate is None):
        return JSONResponse(
            content={"error": "No explanation data available. Please explain an instance first."},
            status_code=400
        )
    return None

# ---------------- Endpoint Functions ---------------- #

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """
    Update visualization technique without regenerating the neighborhood.
    """
    try:
        # Validate dataset and scatter plot method
        err = validate_dataset(request.dataset_name)
        if err:
            return err
        
        err = validate_scatter_plot_method(request.scatterPlotMethod)
        if err:
            return err
        
        # Check if neighborhood data is available
        err = validate_neighborhood_availability()
        if err:
            return err
        
        # Generate scatter plot visualization data
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.feature_names,
            X=global_state.neighb_train_X,
            y=global_state.neighb_train_y,
            surrogate=global_state.dt_surrogate,
            class_names=global_state.target_names
        )
        if isinstance(scatter_data, JSONResponse):
            return scatter_data

        # Generate decision tree visualization data
        tree_data = generate_decision_tree_data(
            surrogate=global_state.dt_surrogate,
            feature_names=global_state.feature_names,
            target_names=global_state.target_names
        )
        if isinstance(tree_data, JSONResponse):
            return tree_data

        return {
            "status": "success",
            "message": "Visualization updated",
            "decisionTreeVisualizationData": tree_data,
            "scatterPlotVisualizationData": scatter_data,
            "uniqueClasses": global_state.target_names,
        }
    except Exception as e:
        logging.error(f"Unexpected error in update_visualization: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)

@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """
    Generate a local explanation for a given instance.
    """
    try:
        # Validate dataset and parameters
        err = validate_dataset(request.dataset_name)
        if err:
            return err
        
        if request.neighbourhood_size <= 0:
            return JSONResponse(content={"error": "Neighbourhood size must be positive"}, status_code=400)
            
        if request.scatterPlotStep <= 0:
            return JSONResponse(content={"error": "Scatter plot step must be positive"}, status_code=400)
            
        err = validate_scatter_plot_method(request.scatterPlotMethod)
        if err:
            return err

        # Process instance data
        instance_values = process_instance(request)
        if isinstance(instance_values, JSONResponse):
            return instance_values
        
        # Check for trained model and dataset
        if global_state.bbox is None:
            return JSONResponse(content={"error": "No trained model available. Please train a model first."}, status_code=400)
        if global_state.dataset is None:
            return JSONResponse(content={"error": "No dataset available. Please train a model first."}, status_code=400)
        
        # Create neighborhood using lore
        try:
            neighbourhood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
                instance=instance_values,
                bbox=global_state.bbox,
                dataset=global_state.dataset,
                neighbourhood_size=request.neighbourhood_size,
            )
        except Exception as e:
            logging.error(f"Error creating neighbourhood: {str(e)}")
            return JSONResponse(content={"error": f"Error creating neighbourhood: {str(e)}"}, status_code=500)

        global_state.target_names = list(np.unique(neighb_train_y))

        # Create decision tree surrogate
        try:
            dt_surr = get_lore_decision_tree_surrogate(
                neighbour=neighbourhood,
                neighb_train_yz=neighb_train_yz
            )
        except Exception as e:
            logging.error(f"Error creating decision tree surrogate: {str(e)}")
            return JSONResponse(content={"error": f"Error creating decision tree surrogate: {str(e)}"}, status_code=500)

        # Update global state with neighborhood data
        global_state.neighborhood = neighbourhood
        global_state.neighb_train_X = neighb_train_X
        global_state.neighb_train_y = neighb_train_y
        global_state.neighb_train_yz = neighb_train_yz
        global_state.dt_surrogate = dt_surr

        # Generate decision tree visualization data
        tree_data = generate_decision_tree_data(
            surrogate=dt_surr,
            feature_names=global_state.feature_names,
            target_names=global_state.target_names
        )
        if isinstance(tree_data, JSONResponse):
            return tree_data

        # Generate scatter plot visualization data
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.feature_names,
            X=neighb_train_X,
            y=neighb_train_y,
            surrogate=dt_surr,
            class_names=global_state.target_names
        )
        if isinstance(scatter_data, JSONResponse):
            return scatter_data

        return {
            "status": "success",
            "message": "Instance explained",
            "decisionTreeVisualizationData": tree_data,
            "scatterPlotVisualizationData": scatter_data,
            "uniqueClasses": global_state.target_names,
        }
    except Exception as e:
        logging.error(f"Unexpected error in explain_instance: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)
