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

def process_instance(request: InstanceRequest):
    """Process tabular data input."""
    return [request.instance[feature] for feature in global_state.feature_names]
    
def generate_scatter_plot(request, feature_names, X, y, surrogate, class_names):
    """Generate scatter plot visualization data using the provided parameters."""
    return create_scatter_plot_data(
        feature_names=feature_names,
        X=X,
        y=y,
        pretrained_tree=surrogate,
        class_names=class_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod
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
    
@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """
    Generate a local explanation for a given instance.
    """
    # Process instance data
    instance_values = process_instance(request)
            
    # Create neighborhood using lore
    neighbourhood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
        instance=instance_values,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )

    global_state.target_names = list(np.unique(neighb_train_y))

    # Create decision tree surrogate
    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighbourhood,
        neighb_train_yz=neighb_train_yz
    )
    
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
    
    # Generate scatter plot visualization data
    scatter_data = generate_scatter_plot(
        request,
        feature_names=global_state.feature_names,
        X=neighb_train_X,
        y=neighb_train_y,
        surrogate=dt_surr,
        class_names=global_state.target_names
    )
    
    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": tree_data,
        "scatterPlotVisualizationData": scatter_data,
        "uniqueClasses": global_state.target_names,
    }
