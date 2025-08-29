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
    scatterPlotMethod: str = "umap",
    includeOriginalDataset: bool

class VisualizationRequest(BaseModel):
    dataset_name: str
    scatterPlotStep: float
    scatterPlotMethod: str = "umap",
    includeOriginalDataset: bool

# ---------------- Helper Functions ---------------- #

def process_instance(request: InstanceRequest):
    """Process tabular data input."""
    return [request.instance[feature] for feature in global_state.feature_names]
    
def generate_scatter_plot(request, feature_names, X, y, surrogate, class_names, X_original=None, y_original=None):
    """Generate scatter plot visualization data using the provided parameters."""
    return create_scatter_plot_data(
        feature_names=feature_names,
        X=X,
        y=y,
        pretrained_tree=surrogate,
        class_names=class_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod,
        X_original=X_original, 
        y_original=y_original
    )

def generate_decision_tree_data(surrogate, feature_names, target_names):
    """Extract and generate decision tree visualization data."""
    tree_structure = extract_tree_structure(
        tree_classifier=surrogate,
        feature_names=feature_names,
        target_names=target_names
    )
    return generate_decision_tree_visualization_data(tree_structure)

# ---------------- Endpoint Functions ---------------- #

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """
    Update visualization technique without regenerating the neighborhood.
    """ 
    # Generate decision tree visualization data using ENCODED feature names
    tree_data = generate_decision_tree_data(
        surrogate=global_state.dt_surrogate,
        feature_names=global_state.encoded_feature_names,  # Use encoded feature names
        target_names=global_state.target_names
    )

    if not request.includeOriginalDataset:    
        # Generate scatter plot visualization data using ORIGINAL feature names
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.encoded_feature_names,  # Original feature names for scatter plot
            X=global_state.neighborhood,  # Encoded data
            y=global_state.neighb_train_y,
            surrogate=global_state.dt_surrogate,
            class_names=global_state.target_names
        )
    else:
        # Generate scatter plot visualization data using ORIGINAL feature names
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.encoded_feature_names,  # Original feature names for scatter plot
            X=global_state.neighborhood,  # Encoded data
            y=global_state.neighb_train_y,
            surrogate=global_state.dt_surrogate,
            class_names=global_state.target_names,
            X_original=global_state.X_train,
            y_original=global_state.y_train
        )
    
    return {
        "status": "success",
        "message": "Visualization updated",
        "decisionTreeVisualizationData": tree_data,
        "scatterPlotVisualizationData": scatter_data,
        "uniqueClasses": global_state.target_names,
    }
    
@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """
    Generate a local explanation for a given instance.
    """
    # Process instance data
    instance_values = process_instance(request)
            
    # Create neighborhood using lore - now returns encoded feature names too
    neighborhood, neighb_train_X, neighb_train_y, neighb_train_yz, encoded_feature_names = create_neighbourhood_with_lore(
        instance=instance_values,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )
    
    # Update global state with neighborhood data and encoded feature names
    global_state.neighborhood = neighborhood
    global_state.neighb_train_X = neighb_train_X
    global_state.neighb_train_y = neighb_train_y
    global_state.neighb_train_yz = neighb_train_yz
    global_state.encoded_feature_names = encoded_feature_names  # Store encoded feature names

    # Create decision tree surrogate
    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighborhood,
        neighb_train_yz=neighb_train_yz
    )
    
    # Update global state with the decision tree surrogate
    global_state.dt_surrogate = dt_surr
    
    # Generate decision tree visualization data using ENCODED feature names
    tree_data = generate_decision_tree_data(
        surrogate=dt_surr,
        feature_names=encoded_feature_names,  # Use encoded feature names instead of original
        target_names=global_state.target_names
    )
    
    if not request.includeOriginalDataset:    
        # Update global state with the target names
        global_state.target_names = list(np.unique(neighb_train_y))

        # Generate scatter plot visualization data - use ORIGINAL feature names for scatter plot
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.encoded_feature_names,  # Original feature names for scatter plot
            X=neighborhood,  # Endoded data
            y=neighb_train_y,
            surrogate=dt_surr,
            class_names=global_state.target_names
        )
    else:
        # Generate scatter plot visualization data
        scatter_data = generate_scatter_plot(
            request,
            feature_names=global_state.encoded_feature_names,  # Original feature names for scatter plot
            X=neighborhood,  # Encoded data
            y=neighb_train_y,
            surrogate=dt_surr,
            class_names=global_state.target_names,
            X_original=global_state.X_train,
            y_original=global_state.y_train
        )
    
    # import json
    # with open ("tree.json", "w") as f:
    #     json.dump(tree_data, f)
    # with open ("instance.json", "w") as f:
    #     json.dump(request.instance, f)

    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": tree_data,
        "scatterPlotVisualizationData": scatter_data,
        "uniqueClasses": global_state.target_names,
    }
