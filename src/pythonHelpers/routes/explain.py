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


def process_instance(request):
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

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """
    Update visualization technique without regenerating the neighborhood.
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
            
        if not request.scatterPlotMethod:
            return JSONResponse(content={"error": "Scatter plot method is required"}, status_code=400)
            
        if request.scatterPlotMethod not in ['pca', 'tsne', 'umap', 'mds']:
            return JSONResponse(
                content={"error": f"Unsupported method: {request.scatterPlotMethod}. Use 'pca', 'tsne', 'umap', or 'mds'."},
                status_code=400
            )
            
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
        try:
            scatterPlotVisualizationData = create_scatter_plot_data(
                feature_names=global_state.feature_names,
                X=global_state.neighb_train_X,
                y=global_state.neighb_train_y,
                pretrained_tree=global_state.dt_surrogate,
                class_names=global_state.target_names,
                step=request.scatterPlotStep,
                method=request.scatterPlotMethod
            )
        except Exception as e:
            logging.error(f"Error creating scatter plot: {str(e)}")
            return JSONResponse(content={"error": f"Error creating scatter plot: {str(e)}"}, status_code=500)

        # Extract the decision tree structure for visualization
        try:
            decision_tree_structure = extract_tree_structure(
                tree_classifier=global_state.dt_surrogate,
                feature_names=global_state.feature_names,
                target_names=global_state.target_names
            )
            decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)
        except Exception as e:
            logging.error(f"Error generating decision tree visualization: {str(e)}")
            return JSONResponse(content={"error": f"Error generating decision tree visualization: {str(e)}"}, status_code=500)

        return {
            "status": "success",
            "message": "Visualization updated",
            "decisionTreeVisualizationData": decisionTreeVisualizationData,
            "scatterPlotVisualizationData": scatterPlotVisualizationData,
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
        # Validate request
        if not request.dataset_name:
            return JSONResponse(content={"error": "Dataset name is required"}, status_code=400)
            
        if request.dataset_name not in DATASETS:
            return JSONResponse(
                content={"error": f"Dataset '{request.dataset_name}' not found. Available datasets: {list(DATASETS.keys())}"},
                status_code=400
            )
            
        if request.neighbourhood_size <= 0:
            return JSONResponse(content={"error": "Neighbourhood size must be positive"}, status_code=400)
            
        if request.scatterPlotStep <= 0:
            return JSONResponse(content={"error": "Scatter plot step must be positive"}, status_code=400)
            
        if request.scatterPlotMethod not in ['pca', 'tsne', 'umap', 'mds']:
            return JSONResponse(
                content={"error": f"Unsupported method: {request.scatterPlotMethod}. Use 'pca', 'tsne', 'umap', or 'mds'."},
                status_code=400
            )
            
        # Process instance data
        instance_values = process_instance(request)
        
        if isinstance(instance_values, JSONResponse):
            return instance_values
        
        # Check if we have a trained model
        if global_state.bbox is None:
            return JSONResponse(content={"error": "No trained model available. Please train a model first."}, status_code=400)
            
        if global_state.dataset is None:
            return JSONResponse(content={"error": "No dataset available. Please train a model first."}, status_code=400)
        
        try:
            neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
                instance=instance_values,
                bbox=global_state.bbox,
                dataset=global_state.dataset,
                neighbourhood_size=request.neighbourhood_size,
            )
        except Exception as e:
            logging.error(f"Error creating neighbourhood: {str(e)}")
            return JSONResponse(content={"error": f"Error creating neighbourhood: {str(e)}"}, status_code=500)

        global_state.target_names = list(np.unique(neighb_train_y))

        # Generate a surrogate decision tree model.
        try:
            dt_surr = get_lore_decision_tree_surrogate(
                neighbour=neighbourood,
                neighb_train_yz=neighb_train_yz
            )
        except Exception as e:
            logging.error(f"Error creating decision tree surrogate: {str(e)}")
            return JSONResponse(content={"error": f"Error creating decision tree surrogate: {str(e)}"}, status_code=500)

        # Store the neighborhood data in global state
        global_state.neighborhood = neighbourood
        global_state.neighb_train_X = neighb_train_X
        global_state.neighb_train_y = neighb_train_y
        global_state.neighb_train_yz = neighb_train_yz
        global_state.dt_surrogate = dt_surr

        # Extract the decision tree structure for visualization.
        try:
            decision_tree_structure = extract_tree_structure(
                tree_classifier=dt_surr,
                feature_names=global_state.feature_names,
                target_names=global_state.target_names
            )
            decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)
        except Exception as e:
            logging.error(f"Error generating decision tree visualization: {str(e)}")
            return JSONResponse(content={"error": f"Error generating decision tree visualization: {str(e)}"}, status_code=500)

        # Generate scatter plot data.
        try:
            scatterPlotVisualizationData = create_scatter_plot_data(
                feature_names=global_state.feature_names,
                X=neighb_train_X,
                y=neighb_train_y,
                pretrained_tree=dt_surr,
                class_names=global_state.target_names,
                step=request.scatterPlotStep,
                method=request.scatterPlotMethod
            )
        except Exception as e:
            logging.error(f"Error creating scatter plot: {str(e)}")
            return JSONResponse(content={"error": f"Error creating scatter plot: {str(e)}"}, status_code=500)

        return {
            "status": "success",
            "message": "Instance explained",
            "decisionTreeVisualizationData": decisionTreeVisualizationData,
            "scatterPlotVisualizationData": scatterPlotVisualizationData,
            "uniqueClasses": global_state.target_names,
        }
    except Exception as e:
        logging.error(f"Unexpected error in explain_instance: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)
