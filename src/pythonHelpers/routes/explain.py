# routes/explain.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import numpy as np

from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import (
    generate_decision_tree_visualization_data,
    extract_tree_structure
)
from pythonHelpers.create_scatter_plot_data import create_scatter_plot_data
from pythonHelpers.datasets import DATASETS
from pythonHelpers.routes.state import global_state


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


def process_instance(request):
    """Process tabular data input."""
    if not request.instance:
        return JSONResponse(content={"error": "No instance data provided"}, status_code=400)
    return [request.instance[feature] for feature in global_state.feature_names]

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """
    Update visualization technique without regenerating the neighborhood.
    """
    # Check if we have stored neighborhood data
    if (global_state.neighborhood is None or 
        global_state.neighb_train_X is None or 
        global_state.neighb_train_y is None or 
        global_state.dt_surrogate is None):
        return JSONResponse(
            content={"error": "No explanation data available. Please explain an instance first."},
            status_code=400
        )
    
    # Generate scatter plot data with the new method
    scatterPlotVisualizationData = create_scatter_plot_data(
        feature_names=global_state.feature_names,
        X=global_state.neighb_train_X,
        y=global_state.neighb_train_y,
        pretrained_tree=global_state.dt_surrogate,
        class_names=global_state.target_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod
    )

    # Extract the decision tree structure for visualization
    decision_tree_structure = extract_tree_structure(
        tree_classifier=global_state.dt_surrogate,
        feature_names=global_state.feature_names,
        target_names=global_state.target_names
    )
    decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)

    return {
        "status": "success",
        "message": "Visualization updated",
        "decisionTreeVisualizationData": decisionTreeVisualizationData,
        "scatterPlotVisualizationData": scatterPlotVisualizationData,
        "uniqueClasses": global_state.target_names,
    }

@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """
    Generate a local explanation for a given instance.
    """
    instance_values = process_instance(request)
    
    if isinstance(instance_values, JSONResponse):
        return instance_values
    
    neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
        instance=instance_values,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )

    global_state.target_names = list(np.unique(neighb_train_y))

    # Generate a surrogate decision tree model.
    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighbourood,
        neighb_train_yz=neighb_train_yz
    )

    # Store the neighborhood data in global state
    global_state.neighborhood = neighbourood
    global_state.neighb_train_X = neighb_train_X
    global_state.neighb_train_y = neighb_train_y
    global_state.neighb_train_yz = neighb_train_yz
    global_state.dt_surrogate = dt_surr

    # Extract the decision tree structure for visualization.
    decision_tree_structure = extract_tree_structure(
        tree_classifier=dt_surr,
        feature_names=global_state.feature_names,
        target_names=global_state.target_names
    )
    decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)

    # Generate scatter plot data.
    scatterPlotVisualizationData = create_scatter_plot_data(
        feature_names=global_state.feature_names,
        X=neighb_train_X,
        y=neighb_train_y,
        pretrained_tree=dt_surr,
        class_names=global_state.target_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod
    )

    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": decisionTreeVisualizationData,
        "scatterPlotVisualizationData": scatterPlotVisualizationData,
        "uniqueClasses": global_state.target_names,
    }
