# routes/explain.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import numpy as np
from collections import OrderedDict

from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import (
    extract_tree_structure,
    generate_decision_tree_visualization_data_raw
)
from pythonHelpers.create_scatter_plot_data import create_scatter_plot_data_raw
from pythonHelpers.routes.state import global_state
from pythonHelpers.datasets import DATASETS

router = APIRouter(prefix="/api")

class InstanceRequest(BaseModel):
    instance: Optional[Dict[str, Any]] = None
    dataset_name: str
    neighbourhood_size: int
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"
    includeOriginalDataset: bool

class VisualizationRequest(BaseModel):
    dataset_name: str
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"
    includeOriginalDataset: bool

# ---------------- Data Processing Functions ---------------- #

def validate_instance_features(instance: Dict[str, Any]) -> None:
    """Validate that all required features are present in the instance."""
    missing_features = set(global_state.feature_names) - set(instance.keys())
    if missing_features:
        raise ValueError(f"Missing features: {missing_features}")

def get_ordered_feature_names() -> list[str]:
    """Get feature names in the correct order based on dataset descriptor indices."""
    feature_order = []
    
    # Collect numeric features with their indices
    for feature_name, info in global_state.dataset.descriptor['numeric'].items():
        feature_order.append((info['index'], feature_name))
    
    # Collect categorical features with their indices    
    for feature_name, info in global_state.dataset.descriptor['categorical'].items():
        feature_order.append((info['index'], feature_name))
    
    # Sort by index and return feature names
    feature_order.sort(key=lambda x: x[0])
    return [name for _, name in feature_order]

def process_instance(request: InstanceRequest) -> OrderedDict:
    """Process tabular data input - return ordered dictionary for better handling."""
    validate_instance_features(request.instance)
    ordered_feature_names = get_ordered_feature_names()
    
    # Return as OrderedDict maintaining the dataset's expected feature order
    return OrderedDict((feature, request.instance[feature]) for feature in ordered_feature_names)

# ---------------- Visualization Generation Functions ---------------- #

def generate_scatter_plot_with_original_data(request, X, y, surrogate, class_names, X_original, y_original):
    """Generate scatter plot visualization including original dataset data."""
    from pythonHelpers.lore import ColumnTransformerEnc
    
    # Initialize encoder with the dataset descriptor
    tabular_enc = ColumnTransformerEnc(global_state.dataset.descriptor)
    
    # Encode the original training data
    X_train_encoded = tabular_enc.encode(global_state.X_train)
    
    scatter_data = create_scatter_plot_data_raw(
        X=X,  # Use encoded neighborhood data
        y=y,
        pretrained_tree=surrogate,
        class_names=class_names,
        feature_names=global_state.feature_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod,
        X_original=X_train_encoded,  # Use encoded original data
        y_original=y_original
    )
    
    # Override with mixed original training and decoded neighborhood data
    original_data_list = []
    
    # Add original training data (decoded format)
    for _, row in global_state.X_train.iterrows():
        original_data_list.append(row.to_dict())
        
    # Add neighborhood data (decoded format)  
    for _, row in global_state.neighb_train_X.iterrows():
        original_data_list.append(row.to_dict())
        
    scatter_data['originalData'] = original_data_list
    return scatter_data

def generate_scatter_plot_neighborhood_only(request, X, y, surrogate, class_names):
    """Generate scatter plot visualization with neighborhood data only."""
    scatter_data = create_scatter_plot_data_raw(
        X=X,  # Use encoded numerical data for dimensionality reduction
        y=y,
        pretrained_tree=surrogate,
        class_names=class_names,
        feature_names=global_state.feature_names,
        step=request.scatterPlotStep,
        method=request.scatterPlotMethod,
    )
    
    # Override with decoded data for proper display
    scatter_data['originalData'] = []
    for _, row in global_state.neighb_train_X.iterrows():
        scatter_data['originalData'].append(row.to_dict())
        
    return scatter_data

def generate_scatter_plot_visualization(request, X, y, surrogate, class_names, X_original=None, y_original=None):
    """Generate scatter plot data for frontend processing."""
    if request.includeOriginalDataset and X_original is not None and y_original is not None:
        return generate_scatter_plot_with_original_data(
            request, X, y, surrogate, class_names, X_original, y_original
        )
    else:
        global_state.target_names = list(np.unique(y))
        return generate_scatter_plot_neighborhood_only(
            request, X, y, surrogate, class_names
        )

def generate_decision_tree_visualization(surrogate, encoded_feature_names, target_names):
    """Extract decision tree data for frontend processing."""
    tree_structure = extract_tree_structure(
        tree_classifier=surrogate,
        feature_names=encoded_feature_names,
        target_names=target_names
    )
    return generate_decision_tree_visualization_data_raw(tree_structure)

# ---------------- Response Building Functions ---------------- #

def build_feature_mapping_info(encoded_feature_names=None):
    """Build feature mapping information for the response."""
    return {
        "originalFeatureNames": global_state.feature_names,
        "encodedFeatureNames": encoded_feature_names or global_state.encoded_feature_names,
        "datasetDescriptor": global_state.dataset.descriptor
    }

def build_visualization_response(tree_data, scatter_data, encoded_feature_names=None):
    """Build the complete visualization response."""
    return {
        "status": "success",
        "message": "Visualization updated",
        "decisionTreeVisualizationData": tree_data,
        "scatterPlotVisualizationData": scatter_data,
        "uniqueClasses": global_state.target_names,
        "featureMappingInfo": build_feature_mapping_info(encoded_feature_names)
    }

def build_explanation_response(tree_data, scatter_data, encoded_feature_names):
    """Build the complete explanation response."""
    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": tree_data,
        "scatterPlotVisualizationData": scatter_data,
        "uniqueClasses": global_state.target_names,
        "featureMappingInfo": build_feature_mapping_info(encoded_feature_names)
    }

# ---------------- Global State Update Functions ---------------- #

def update_global_state_with_neighborhood(neighborhood, neighb_train_X, neighb_train_y, neighb_train_yz, encoded_feature_names):
    """Update global state with neighborhood data and encoded feature names."""
    global_state.neighborhood = neighborhood
    global_state.neighb_train_X = neighb_train_X
    global_state.neighb_train_y = neighb_train_y
    global_state.neighb_train_yz = neighb_train_yz
    global_state.encoded_feature_names = encoded_feature_names

def update_global_state_with_surrogate(dt_surrogate):
    """Update global state with the decision tree surrogate."""
    global_state.dt_surrogate = dt_surrogate

# ---------------- API Endpoint Functions ---------------- #

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """Update visualization technique without regenerating the neighborhood.""" 
    # Generate decision tree visualization data
    tree_data = generate_decision_tree_visualization(
        surrogate=global_state.dt_surrogate,
        encoded_feature_names=global_state.encoded_feature_names,
        target_names=global_state.target_names
    )

    # Generate scatter plot based on whether to include original dataset
    scatter_data = generate_scatter_plot_visualization(
        request=request,
        X=global_state.neighborhood,
        y=global_state.neighb_train_y,
        surrogate=global_state.dt_surrogate,
        class_names=global_state.target_names,
        X_original=global_state.X_train if request.includeOriginalDataset else None,
        y_original=global_state.y_train if request.includeOriginalDataset else None
    )
    
    return build_visualization_response(tree_data, scatter_data, global_state.encoded_feature_names)
    
@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """Generate a local explanation for a given instance."""
    # Process and validate instance data
    instance_dict = process_instance(request)
            
    # Create neighborhood using LORE
    neighborhood, neighb_train_X, neighb_train_y, neighb_train_yz, encoded_feature_names = create_neighbourhood_with_lore(
        instance=instance_dict,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )
    
    # Update global state with neighborhood data
    update_global_state_with_neighborhood(
        neighborhood, neighb_train_X, neighb_train_y, neighb_train_yz, encoded_feature_names
    )

    # Create and store decision tree surrogate
    dt_surrogate = get_lore_decision_tree_surrogate(
        neighbour=neighborhood,
        neighb_train_yz=neighb_train_yz
    )
    update_global_state_with_surrogate(dt_surrogate)
    
    # Generate visualizations
    tree_data = generate_decision_tree_visualization(
        surrogate=dt_surrogate,
        encoded_feature_names=encoded_feature_names,
        target_names=global_state.target_names
    )
    
    scatter_data = generate_scatter_plot_visualization(
        request=request,
        X=neighborhood,
        y=neighb_train_y,
        surrogate=dt_surrogate,
        class_names=global_state.target_names,
        X_original=global_state.X_train if request.includeOriginalDataset else None,
        y_original=global_state.y_train if request.includeOriginalDataset else None
    )

    return build_explanation_response(tree_data, scatter_data, encoded_feature_names)
