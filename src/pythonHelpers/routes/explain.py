from fastapi import APIRouter
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

router = APIRouter(prefix="/api")


# ---------------- Request Models ---------------- #

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


# ---------------- Core Processing Classes ---------------- #

class InstanceProcessor:
    """Handles instance data processing and validation."""
    
    @staticmethod
    def get_ordered_feature_names():
        """Get feature names in order based on dataset descriptor indices."""
        features = []
        for name, info in global_state.dataset.descriptor['numeric'].items():
            features.append((info['index'], name))
        for name, info in global_state.dataset.descriptor['categorical'].items():
            features.append((info['index'], name))
        features.sort(key=lambda x: x[0])
        return [name for _, name in features]
    
    @staticmethod
    def process_instance(request: InstanceRequest):
        """Convert instance request to ordered dictionary."""
        ordered_names = InstanceProcessor.get_ordered_feature_names()
        return OrderedDict((name, request.instance[name]) for name in ordered_names)
    
    @staticmethod
    def encode_instance(instance_dict):
        """Encode instance using the same encoder as the dataset."""
        from lore_sa.encoder_decoder import ColumnTransformerEnc
        encoder = ColumnTransformerEnc(global_state.dataset.descriptor)
        # Convert OrderedDict to a single row for encoding
        instance_array = np.array([[instance_dict[name] for name in instance_dict.keys()]])
        encoded_instance = encoder.encode(instance_array)[0]  # Get first (and only) row
        
        # Convert back to dictionary with encoded feature names
        encoded_instance_dict = {}
        for i, feature_name in enumerate(global_state.encoded_feature_names or []):
            if i < len(encoded_instance):
                encoded_instance_dict[feature_name] = float(encoded_instance[i])
        
        return encoded_instance_dict

class VisualizationGenerator:
    """Handles visualization data generation."""
    
    @staticmethod
    def generate_decision_tree_data(surrogate, feature_names, target_names):
        """Generate decision tree visualization data."""
        tree_structure = extract_tree_structure(surrogate, feature_names, target_names)
        return generate_decision_tree_visualization_data_raw(tree_structure)
    
    @staticmethod
    def generate_scatter_plot_data(request, X, y, surrogate, class_names, 
                                 X_original=None, y_original=None):
        """Generate scatter plot visualization data."""
        return create_scatter_plot_data_raw(
            X=X,
            y=y,
            pretrained_tree=surrogate,
            class_names=class_names,
            feature_names=global_state.encoded_feature_names,
            step=request.scatterPlotStep,
            method=request.scatterPlotMethod,
            X_original=X_original,
            y_original=y_original
        )


class DataProcessor:
    """Handles data processing for visualizations."""
    
    @staticmethod
    def prepare_scatter_data_with_original(request, X, y, surrogate, class_names):
        """Prepare scatter plot data including original dataset."""
        from lore_sa.encoder_decoder import ColumnTransformerEnc
        
        # Encode original training data
        encoder = ColumnTransformerEnc(global_state.dataset.descriptor)
        X_train_encoded = encoder.encode(global_state.X_train)
        
        # Generate scatter plot data
        scatter_data = VisualizationGenerator.generate_scatter_plot_data(
            request, X, y, surrogate, class_names, X_train_encoded, global_state.y_train
        )
        
        # Add encoded data to original data list (pass encoded neighborhood X instead of decoded)
        DataProcessor._add_encoded_data_to_output(scatter_data, X_train_encoded, X)  # X is already encoded
        
        return scatter_data
    
    @staticmethod
    def prepare_scatter_data_neighborhood_only(request, X, y, surrogate, class_names):
        """Prepare scatter plot data with neighborhood only."""
        global_state.target_names = list(np.unique(y))
        
        scatter_data = VisualizationGenerator.generate_scatter_plot_data(
            request, X, y, surrogate, class_names
        )
        
        # Add encoded neighborhood data (X is already encoded)
        DataProcessor._add_encoded_data_to_output(scatter_data, None, X)
        
        return scatter_data
    
    @staticmethod
    def _add_encoded_data_to_output(scatter_data, X_train_encoded, X_neighborhood):
        """Add encoded data arrays to scatter plot output."""
        data_list = []
        
        # Add original training data if provided (keep encoded)
        if X_train_encoded is not None:
            for row in X_train_encoded:
                data_list.append(DataProcessor._convert_row_to_dict(row))
        
        # Add neighborhood data (use encoded version)
        for row in X_neighborhood:
            data_list.append(DataProcessor._convert_row_to_dict(row))
        
        scatter_data['originalData'] = data_list
    
    @staticmethod
    def _convert_row_to_dict(row):
        """Convert data row to dictionary with proper type conversion."""
        data_dict = {}
        for j, feature_name in enumerate(global_state.encoded_feature_names):
            if j < len(row):
                value = row[j]
                if isinstance(value, np.integer):
                    data_dict[feature_name] = int(value)
                elif isinstance(value, np.floating):
                    data_dict[feature_name] = float(value)
                else:
                    data_dict[feature_name] = value
        return data_dict


class StateManager:
    """Manages global state updates."""
    
    @staticmethod
    def update_neighborhood_data(neighborhood, neighb_train_X, neighb_train_y, 
                                neighb_train_yz, encoded_feature_names):
        """Update global state with neighborhood data."""
        global_state.neighborhood = neighborhood
        global_state.neighb_train_X = neighb_train_X
        global_state.neighb_train_y = neighb_train_y
        global_state.neighb_train_yz = neighb_train_yz
        global_state.encoded_feature_names = encoded_feature_names
    
    @staticmethod
    def update_surrogate_model(surrogate):
        """Update global state with surrogate model."""
        global_state.dt_surrogate = surrogate


class ResponseBuilder:
    """Builds API responses."""
    
    @staticmethod
    def build_feature_mapping():
        """Build feature mapping information."""
        return {
            "originalFeatureNames": global_state.feature_names,
            "encodedFeatureNames": global_state.encoded_feature_names,
            "datasetDescriptor": global_state.dataset.descriptor
        }
    
    @staticmethod
    def build_success_response(message, tree_data, scatter_data, encoded_instance=None):
        """Build successful response with visualization data."""
        response = {
            "status": "success",
            "message": message,
            "decisionTreeVisualizationData": tree_data,
            "scatterPlotVisualizationData": scatter_data,
            "uniqueClasses": global_state.target_names,
            "featureMappingInfo": ResponseBuilder.build_feature_mapping()
        }
        
        if encoded_instance is not None:
            response["encodedInstance"] = encoded_instance
            
        return response


# ---------------- API Endpoints ---------------- #

@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest):
    """Update visualization technique without regenerating neighborhood."""
    
    # Generate decision tree visualization
    tree_data = VisualizationGenerator.generate_decision_tree_data(
        global_state.dt_surrogate,
        global_state.encoded_feature_names,
        global_state.target_names
    )
    
    # Generate scatter plot visualization
    if request.includeOriginalDataset:
        scatter_data = DataProcessor.prepare_scatter_data_with_original(
            request, global_state.neighborhood, global_state.neighb_train_y,
            global_state.dt_surrogate, global_state.target_names
        )
    else:
        scatter_data = DataProcessor.prepare_scatter_data_neighborhood_only(
            request, global_state.neighborhood, global_state.neighb_train_y,
            global_state.dt_surrogate, global_state.target_names
        )
    
    return ResponseBuilder.build_success_response(
        "Visualization updated", tree_data, scatter_data
    )


@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """Generate local explanation for a given instance."""
    
    # Process instance data (original features)
    instance_dict = InstanceProcessor.process_instance(request)

    # Generate neighborhood using LORE
    (neighborhood, neighb_train_X, neighb_train_y, 
     neighb_train_yz, encoded_feature_names) = create_neighbourhood_with_lore(
        instance=instance_dict,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )
    
    # Update global state
    StateManager.update_neighborhood_data(
        neighborhood, neighb_train_X, neighb_train_y, 
        neighb_train_yz, encoded_feature_names
    )
    
    # NOW encode the instance using the same encoder
    encoded_instance = InstanceProcessor.encode_instance(instance_dict)
    
    # Create decision tree surrogate
    surrogate = get_lore_decision_tree_surrogate(neighborhood, neighb_train_yz)
    StateManager.update_surrogate_model(surrogate)
    
    # Generate visualizations
    tree_data = VisualizationGenerator.generate_decision_tree_data(
        surrogate, encoded_feature_names, global_state.target_names
    )
    
    if request.includeOriginalDataset:
        scatter_data = DataProcessor.prepare_scatter_data_with_original(
            request, neighborhood, neighb_train_y, surrogate, global_state.target_names
        )
    else:
        scatter_data = DataProcessor.prepare_scatter_data_neighborhood_only(
            request, neighborhood, neighb_train_y, surrogate, global_state.target_names
        )
    
    return ResponseBuilder.build_success_response(
        "Instance explained", tree_data, scatter_data, encoded_instance
    )
