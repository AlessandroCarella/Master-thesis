from typing import Optional, Dict, Any, List, Tuple, Union
import numpy as np
import pandas as pd
import os
from collections import OrderedDict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..webapp_lore import create_neighbourhood_with_lore, train_surrogate
from ..webapp_generate_decision_tree_visualization_data import (
    extract_tree_structure,
    generate_decision_tree_visualization_data_raw
)
from ..webapp_create_scatter_plot_data import create_scatter_plot_data_raw
from .webapp_api_state import webapp_state
from .webapp_api_utils import safe_json_response

router = APIRouter(prefix="/api")


class InstanceRequest(BaseModel):
    """
    Request model for instance-based explanations.
    
    Attributes
    ----------
    instance : Dict[str, Any]
        Feature values for the instance to explain.
    dataset_name : str
        Name of the dataset being used.
    neighbourhood_size : int
        Number of samples to generate for local explanation.
    scatterPlotStep : float
        Step size for scatter plot generation.
    scatterPlotMethod : str
        Method for dimensionality reduction in scatter plot.
    dimensionalityReductionMethod : str
        Dimensionality reduction method name.
    dimensionalityReductionParameters : Dict[str, Any]
        Method-specific parameters for dimensionality reduction.
    allMethodParameters : Dict[str, Dict[str, Any]]
        Parameters for all dimensionality reduction methods.
    includeOriginalDataset : bool
        Whether to include original training data in visualization.
    keepDuplicates : bool
        Whether to retain duplicate samples in neighborhood.
    """
    instance: Dict[str, Any] = None
    dataset_name: str
    neighbourhood_size: int
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"
    dimensionalityReductionMethod: str = "umap"
    dimensionalityReductionParameters: Dict[str, Any] = {}
    allMethodParameters: Dict[str, Dict[str, Any]] = {}
    includeOriginalDataset: bool
    keepDuplicates: bool


class VisualizationRequest(BaseModel):
    """
    Request model for updating visualization parameters.
    
    Attributes
    ----------
    dataset_name : str
        Name of the dataset being visualized.
    scatterPlotStep : float
        Step size for scatter plot mesh generation.
    scatterPlotMethod : str
        Dimensionality reduction method for visualization.
    dimensionalityReductionMethod : str
        Dimensionality reduction method name.
    dimensionalityReductionParameters : Dict[str, Any]
        Method-specific parameters for dimensionality reduction.
    allMethodParameters : Dict[str, Dict[str, Any]]
        Parameters for all dimensionality reduction methods.
    includeOriginalDataset : bool
        Whether to overlay original training data.
    """
    dataset_name: str
    scatterPlotStep: float
    scatterPlotMethod: str = "umap"
    dimensionalityReductionMethod: str = "umap"
    dimensionalityReductionParameters: Dict[str, Any] = {}
    allMethodParameters: Dict[str, Dict[str, Any]] = {}
    includeOriginalDataset: bool


class InstanceProcessor:
    """Handles processing and encoding of instances for explanation."""
    
    @staticmethod
    def get_ordered_feature_names() -> List[str]:
        """
        Extract feature names in correct index order from dataset descriptor.
        
        Returns
        -------
        List[str]
            Feature names ordered by their dataset indices.
        """
        features = []
        for name, info in webapp_state.dataset.descriptor['numeric'].items():
            features.append((info['index'], name))
        for name, info in webapp_state.dataset.descriptor['categorical'].items():
            features.append((info['index'], name))
        features.sort(key=lambda x: x[0])
        return [name for _, name in features]
    
    @staticmethod
    def process_instance_from_request(instance_dict: Dict[str, Any]) -> OrderedDict[str, Any]:
        """
        Convert instance from request to ordered feature dictionary.
        
        Parameters
        ----------
        instance_dict : Dict[str, Any]
            Instance feature values from request.
            
        Returns
        -------
        OrderedDict[str, Any]
            Instance features in correct order for model processing.
        """
        ordered_names = InstanceProcessor.get_ordered_feature_names()
        return OrderedDict((name, instance_dict[name]) for name in ordered_names)
    
    @staticmethod
    def process_provided_instance() -> OrderedDict[str, Any]:
        """
        Process pre-provided instance from webapp state.
        
        Returns
        -------
        OrderedDict[str, Any]
            Processed instance features in correct order.
            
        Raises
        ------
        ValueError
            If no provided instance is available in webapp state.
        """
        if webapp_state.provided_instance is None:
            raise ValueError("No provided instance available")
        
        ordered_names = InstanceProcessor.get_ordered_feature_names()
        
        if hasattr(webapp_state.provided_instance, 'to_dict'):
            instance_dict = webapp_state.provided_instance.to_dict()
        elif isinstance(webapp_state.provided_instance, dict):
            instance_dict = webapp_state.provided_instance
        else:
            instance_dict = dict(webapp_state.provided_instance)
        
        return OrderedDict((name, instance_dict[name]) for name in ordered_names)
    
    @staticmethod
    def process_instance(request: InstanceRequest) -> Tuple[OrderedDict[str, Any], bool]:
        """
        Process instance from either request or webapp state.
        
        Parameters
        ----------
        request : InstanceRequest
            Request that may or may not contain an instance.
            
        Returns
        -------
        Tuple[OrderedDict[str, Any], bool]
            Processed instance and whether it came from webapp state (True) or request (False).
            
        Raises
        ------
        ValueError
            If no instance is available from either source.
        """
        if request.instance is not None:
            # Use instance from request
            return InstanceProcessor.process_instance_from_request(request.instance)
        elif webapp_state.provided_instance is not None:
            # Use provided instance from webapp state
            return InstanceProcessor.process_provided_instance()
        else:
            raise ValueError("No instance provided in request and no provided instance available in webapp state")
    
    @staticmethod
    def encode_instance(instance_dict: OrderedDict[str, Any]) -> Dict[str, float]:
        """
        Encode instance using the fitted encoder.
        
        Parameters
        ----------
        instance_dict : OrderedDict[str, Any]
            Raw instance feature values.
            
        Returns
        -------
        Dict[str, float]
            Encoded instance with feature names mapped to encoded values.
        """
        instance_array = np.array([[instance_dict[name] for name in instance_dict.keys()]])
        encoded_instance = webapp_state.encoder.encode(instance_array)[0]
        
        encoded_instance_dict = {}
        for i, feature_name in enumerate(webapp_state.encoded_feature_names or []):
            if i < len(encoded_instance):
                encoded_instance_dict[feature_name] = float(encoded_instance[i])
        
        return encoded_instance_dict


class VisualizationGenerator:
    """Generates visualization data for decision trees and scatter plots."""
    
    @staticmethod
    def generate_decision_tree_data(surrogate: Any, feature_names: List[str], 
                                  target_names: List[str]) -> List[Dict[str, Any]]:
        """
        Extract decision tree structure for visualization.
        
        Parameters
        ----------
        surrogate : Any
            Trained surrogate decision tree model.
        feature_names : List[str]
            Names of encoded features used in tree.
        target_names : List[str]
            Class label names for predictions.
            
        Returns
        -------
        List[Dict[str, Any]]
            Tree structure data for frontend visualization.
        """
        tree_structure = extract_tree_structure(surrogate, feature_names, target_names)
        return generate_decision_tree_visualization_data_raw(tree_structure)
    
    @staticmethod
    def generate_scatter_plot_data(request: Union[InstanceRequest, VisualizationRequest], 
                                 X: np.ndarray, y: np.ndarray, surrogate: Any, 
                                 class_names: List[str], X_original: np.ndarray = None, 
                                 y_original: np.ndarray = None) -> Dict[str, Any]:
        """
        Generate scatter plot visualization data.
        
        Parameters
        ----------
        request : Union[InstanceRequest, VisualizationRequest]
            Request containing visualization parameters.
        X : np.ndarray
            Feature matrix for neighborhood samples.
        y : np.ndarray
            Predictions for neighborhood samples.
        surrogate : Any
            Trained surrogate model for decision boundaries.
        class_names : List[str]
            Names of prediction classes.
        X_original : np.ndarray
            Original training data features.
        y_original : np.ndarray 
            Original training data labels.
            
        Returns
        -------
        Dict[str, Any]
            Scatter plot visualization data including transformed coordinates.
        """
        # Store all method parameters in webapp_state 
        webapp_state.update_dimensionality_reduction_parameters(request.allMethodParameters)

        
        method = request.dimensionalityReductionMethod
        parameters = {
            **webapp_state.get_dimensionality_reduction_parameters(method), 
            **request.dimensionalityReductionParameters
        }
        
        return create_scatter_plot_data_raw(
            X=X,
            y=y,
            pretrained_tree=surrogate,
            class_names=class_names,
            feature_names=webapp_state.encoded_feature_names,
            step=request.scatterPlotStep,
            method=method,
            parameters=parameters,
            X_original=X_original,
            y_original=y_original
        )


class DataProcessor:
    """Processes data for visualization including original and neighborhood samples."""
    
    @staticmethod
    def prepare_scatter_data_with_original(request: Union[InstanceRequest, VisualizationRequest],
                                         X: np.ndarray, y: np.ndarray, surrogate: Any, 
                                         class_names: List[str]) -> Dict[str, Any]:
        """
        Prepare scatter plot data including original training samples.
        
        Parameters
        ----------
        request : Union[InstanceRequest, VisualizationRequest]
            Request with visualization parameters.
        X : np.ndarray
            Neighborhood feature matrix.
        y : np.ndarray
            Neighborhood predictions.
        surrogate : Any
            Trained surrogate model.
        class_names : List[str]
            Class label names.
            
        Returns
        -------
        Dict[str, Any]
            Scatter plot data including both original and neighborhood samples.
        """
        X_encoded = webapp_state.encoder.encode(webapp_state.X)
        
        scatter_data = VisualizationGenerator.generate_scatter_plot_data(
            request, X, y, surrogate, class_names, X_encoded, webapp_state.y
        )
        
        DataProcessor._add_encoded_data_to_output(scatter_data, X_encoded, X)
        return scatter_data
    
    @staticmethod
    def prepare_scatter_data_neighborhood_only(request: Union[InstanceRequest, VisualizationRequest],
                                             X: np.ndarray, y: np.ndarray, surrogate: Any, 
                                             class_names: List[str]) -> Dict[str, Any]:
        """
        Prepare scatter plot data with neighborhood samples only.
        
        Parameters
        ----------
        request : Union[InstanceRequest, VisualizationRequest]
            Request with visualization parameters.
        X : np.ndarray
            Neighborhood feature matrix.
        y : np.ndarray
            Neighborhood predictions.
        surrogate : Any
            Trained surrogate model.
        class_names : List[str]
            Class label names.
            
        Returns
        -------
        Dict[str, Any]
            Scatter plot data with neighborhood samples only.
        """
        webapp_state.target_names = list(np.unique(y))
        
        scatter_data = VisualizationGenerator.generate_scatter_plot_data(
            request, X, y, surrogate, class_names
        )
        
        DataProcessor._add_encoded_data_to_output(scatter_data, None, X)
        return scatter_data
    
    @staticmethod
    def _add_encoded_data_to_output(scatter_data: Dict[str, Any], X_encoded: np.ndarray, 
                                  X_neighborhood: np.ndarray) -> None:
        """
        Add encoded data arrays to scatter plot output.
        
        Parameters
        ----------
        scatter_data : Dict[str, Any]
            Scatter plot data dictionary to modify.
        X_encoded : np.ndarray
            Original training data (encoded).
        X_neighborhood : np.ndarray
            Neighborhood data (already encoded).
            
        Notes
        -----
        Modifies scatter_data dictionary in-place by adding 'originalData' key.
        """
        data_list = []
        
        if X_encoded is not None:
            for row in X_encoded:
                data_list.append(DataProcessor._convert_row_to_dict(row))
        
        for row in X_neighborhood:
            data_list.append(DataProcessor._convert_row_to_dict(row))
        
        scatter_data['originalData'] = data_list
    
    @staticmethod
    def _convert_row_to_dict(row: np.ndarray) -> Dict[str, Union[int, float, Any]]:
        """
        Convert numpy array row to dictionary with feature names.
        
        Parameters
        ----------
        row : np.ndarray
            Single row of feature data.
            
        Returns
        -------
        Dict[str, Union[int, float, Any]]
            Feature values mapped to encoded feature names.
        """
        data_dict = {}
        for j, feature_name in enumerate(webapp_state.encoded_feature_names):
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
    """Manages updates to global webapp state during explanation process."""
    
    @staticmethod
    def update_neighborhood_data(neighborhood: np.ndarray, encoded_predictions: np.ndarray, 
                               decoded_neighborhood: pd.DataFrame, predictions: np.ndarray,
                               encoded_feature_names: List[str]) -> None:
        """
        Update webapp state with neighborhood generation results.
        
        Parameters
        ----------
        neighborhood : np.ndarray
            Generated neighborhood samples (encoded).
        encoded_predictions : np.ndarray
            Encoded predictions for neighborhood.
        decoded_neighborhood : pd.DataFrame
            Human-readable neighborhood samples.
        predictions : np.ndarray
            Raw model predictions.
        encoded_feature_names : List[str]
            Names of encoded features.
        """
        webapp_state.neighborhood = neighborhood
        webapp_state.neighb_encoded_predictions = encoded_predictions
        webapp_state.decoded_neighborhood = decoded_neighborhood
        webapp_state.neighb_predictions = predictions
        webapp_state.encoded_feature_names = encoded_feature_names
    
    @staticmethod
    def update_surrogate_model(surrogate: Any) -> None:
        """
        Update webapp state with trained surrogate model.
        
        Parameters
        ----------
        surrogate : Any
            Trained surrogate model for local explanations.
        """
        webapp_state.surrogate = surrogate


class ResponseBuilder:
    """Builds standardized API responses for explanation endpoints."""
    
    @staticmethod
    def build_feature_mapping() -> Dict[str, Any]:
        """
        Build feature mapping information for frontend.
        
        Returns
        -------
        Dict[str, Any]
            Mapping between original and encoded feature names.
        """
        return {
            "originalFeatureNames": webapp_state.feature_names,
            "encodedFeatureNames": webapp_state.encoded_feature_names,
            "datasetDescriptor": webapp_state.dataset.descriptor
        }
    
    @staticmethod
    def build_success_response(message: str, tree_data: List[Dict[str, Any]], 
                             scatter_data: Dict[str, Any], 
                             encoded_instance: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Build successful explanation response.
        
        Parameters
        ----------
        message : str
            Success message for the response.
        tree_data : List[Dict[str, Any]]
            Decision tree visualization data.
        scatter_data : Dict[str, Any]
            Scatter plot visualization data.
        encoded_instance : Dict[str, float]
            Encoded instance being explained.
            
        Returns
        -------
        Dict[str, Any]
            Complete response with all visualization components.
        """
        response = {
            "status": "success",
            "message": message,
            "decisionTreeVisualizationData": tree_data,
            "scatterPlotVisualizationData": scatter_data,
            "uniqueClasses": webapp_state.target_names,
            "featureMappingInfo": ResponseBuilder.build_feature_mapping()
        }
        
        if encoded_instance is not None:
            response["encodedInstance"] = encoded_instance
            
        return response


@router.post("/update-visualization")
async def update_visualization(request: VisualizationRequest) -> Dict[str, Any]:
    """
    Update visualization with new parameters without regenerating explanations.
    
    Parameters
    ----------
    request : VisualizationRequest
        New visualization parameters.
        
    Returns
    -------
    Dict[str, Any]
        Updated visualization data for frontend.
        
    Notes
    -----
    Uses existing neighborhood and surrogate model from webapp state.
    Efficient for adjusting visualization without recomputing explanations.
    """
    tree_data = VisualizationGenerator.generate_decision_tree_data(
        webapp_state.surrogate,
        webapp_state.encoded_feature_names,
        webapp_state.target_names
    )
    
    if request.includeOriginalDataset:
        scatter_data = DataProcessor.prepare_scatter_data_with_original(
            request, webapp_state.neighborhood, webapp_state.neighb_predictions,
            webapp_state.surrogate, webapp_state.target_names
        )
    else:
        scatter_data = DataProcessor.prepare_scatter_data_neighborhood_only(
            request, webapp_state.neighborhood, webapp_state.neighb_predictions,
            webapp_state.surrogate, webapp_state.target_names
        )
    
    return safe_json_response(ResponseBuilder.build_success_response(
        "Visualization updated", tree_data, scatter_data
    ))


@router.post("/explain")
async def explain_instance(request: InstanceRequest) -> Dict[str, Any]:
    """
    Generate local explanations for either a user-provided instance or a pre-provided instance.
    
    Parameters
    ----------
    request : InstanceRequest
        Instance to explain with generation parameters. If instance is None, 
        uses provided instance from webapp state.
        
    Returns
    -------
    Dict[str, Any]
        Complete explanation including decision tree and scatter plot visualizations.
        
    Notes
    -----
    Automatically detects whether to use instance from request or from webapp state.
    Initializes explanation components if needed, generates neighborhood samples,
    trains surrogate model, and produces visualizations.
    """
    # Always reinitialize surrogate and encoder to ensure compatibility with current dataset
    from ...surrogate import DecisionTreeSurrogate
    from ...encoder_decoder import ColumnTransformerEnc
    
    webapp_state.surrogate = DecisionTreeSurrogate()
    webapp_state.encoder = ColumnTransformerEnc(webapp_state.descriptor)

    # Process instance from either request or webapp state
    instance_dict = InstanceProcessor.process_instance(request)

    (neighborhood, encoded_predictions, 
    decoded_neighborhood, predictions,
     encoded_feature_names) = create_neighbourhood_with_lore(
        instance=instance_dict,
        bbox=webapp_state.bbox,
        dataset=webapp_state.dataset,
        keepDuplicates=request.keepDuplicates,
        neighbourhood_size=request.neighbourhood_size,
    )
    
    StateManager.update_neighborhood_data(
        neighborhood, encoded_predictions, 
        decoded_neighborhood, predictions,
        encoded_feature_names
    )
    
    encoded_instance = InstanceProcessor.encode_instance(instance_dict)
    
    train_surrogate(neighborhood, webapp_state.neighb_encoded_predictions)
    StateManager.update_surrogate_model(webapp_state.surrogate)
        
    tree_data = VisualizationGenerator.generate_decision_tree_data(
        webapp_state.surrogate, encoded_feature_names, webapp_state.target_names
    )
    
    if request.includeOriginalDataset:
        scatter_data = DataProcessor.prepare_scatter_data_with_original(
            request, neighborhood, webapp_state.neighb_predictions, webapp_state.surrogate, webapp_state.target_names
        )
    else:
        scatter_data = DataProcessor.prepare_scatter_data_neighborhood_only(
            request, neighborhood, webapp_state.neighb_predictions, webapp_state.surrogate, webapp_state.target_names
        )
    
    return safe_json_response(ResponseBuilder.build_success_response(
        "Instance explained", tree_data, scatter_data, encoded_instance
    ))


@router.get("/check-custom-data")
async def check_custom_data() -> Dict[str, Any]:
    """
    Check status of custom data loading and provided instances.
    
    Returns
    -------
    Dict[str, Any]
        Status information about loaded custom data and instances.
        
    Notes
    -----
    Reads environment variables to determine if custom data workflow
    is active and returns relevant state information.
    """
    try:
        custom_data_loaded = os.environ.get("CUSTOM_DATA_LOADED", "false").lower() == "true"
        instance_provided = os.environ.get("INSTANCE_PROVIDED", "false").lower() == "true"
        
        if custom_data_loaded and hasattr(webapp_state, 'dataset') and webapp_state.dataset is not None:
            response_data = {
                "custom_data_loaded": True,
                "instance_provided": instance_provided,
                "dataset_name": getattr(webapp_state, 'dataset_name', 'Custom Dataset'),
                "descriptor": webapp_state.dataset.descriptor,
                "feature_names": getattr(webapp_state, 'feature_names', [])
            }
            
            if instance_provided and webapp_state.provided_instance is not None:
                if hasattr(webapp_state.provided_instance, 'to_dict'):
                    instance_dict = webapp_state.provided_instance.to_dict()
                elif isinstance(webapp_state.provided_instance, dict):
                    instance_dict = webapp_state.provided_instance
                else:
                    instance_dict = dict(webapp_state.provided_instance)
                
                response_data["provided_instance"] = instance_dict
            
            return safe_json_response(response_data)
        else:
            return {
                "custom_data_loaded": False,
                "instance_provided": False
            }
            
    except Exception as e:
        return {
            "custom_data_loaded": False,
            "instance_provided": False,
            "error": str(e)
        }
