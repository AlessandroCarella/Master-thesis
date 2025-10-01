from typing import Optional, List, Any, Dict
import numpy as np
import pandas as pd


class WebappState:
    """
    Global state management for the webapp application.
    
    Manages machine learning model artifacts, datasets, and explanation
    components across API requests.
    
    Attributes
    ----------
    bbox : Any
        Black-box model wrapper for predictions.
    descriptor : dict
        Dataset feature type information and metadata.
    X : np.ndarray
        Training feature matrix.
    y : np.ndarray
        Training target vector.
    dataset : Any
        Loaded dataset object with preprocessing information.
    dataset_name : str
        Name identifier for the current dataset.
    feature_names : List[str]
        Original feature column names.
    target_names : List[str]
        Class label names for classification tasks.
    encoded_feature_names : List[str]
        Feature names after encoding transformations.
    neighborhood : np.ndarray
        Generated neighborhood samples for explanation.
    neighb_encoded_predictions : np.ndarray
        Encoded predictions for neighborhood samples.
    decoded_neighborhood : pd.DataFrame
        Human-readable neighborhood samples.
    neighb_predictions : np.ndarray
        Raw predictions for neighborhood samples.
    dt_surrogate : Any
        Decision tree surrogate model for explanations.
    encoder : Any
        Feature encoding/decoding transformer.
    generator : Any
        Neighborhood sample generator.
    surrogate : Any
        Surrogate model for local explanations.
    provided_instance : Any
        User-provided instance for explanation.
    dimensionality_reduction_parameters : Dict[str, Dict[str, Any]]
        Parameters for all dimensionality reduction methods.
    """
    
    def __init__(self) -> None:
        """Initialize webapp state with default None values."""
        self.bbox: Any= None
        self.descriptor: dict = None
        self.X: np.ndarray = None
        self.y: np.ndarray = None
        
        self.dataset: Any = None
        self.dataset_name: str = None
        self.feature_names: List[str] = None
        self.target_names: List[str] = None
        self.encoded_feature_names: List[str] = None

        self.neighborhood: np.ndarray = None
        self.neighb_encoded_predictions: np.ndarray = None

        self.decoded_neighborhood: pd.DataFrame = None
        self.neighb_predictions: np.ndarray = None
        self.dt_surrogate: Any = None
        
        self.encoder: Any = None
        self.generator: Any = None
        self.surrogate: Any = None

        self.provided_instance: Any = None
        
        # Store parameters for all dimensionality reduction methods
        self.dimensionality_reduction_parameters: Dict[str, Dict[str, Any]] = {
            "UMAP": {},
            "PCA": {},
            "t-SNE": {},
            "MDS": {}
        }

    def reset(self) -> None:
        """
        Reset all state variables to initial None values.
        
        Notes
        -----
        Use when switching between different explanation sessions.
        """
        self.__init__()
    
    def reset_explanation_components(self) -> None:
        """
        Reset encoder, surrogate, and neighborhood-related state.
        
        This should be called when switching datasets to ensure
        that explanation components are compatible with the new dataset.
        """
        self.encoder = None
        self.surrogate = None
        self.generator = None
        self.neighborhood = None
        self.neighb_encoded_predictions = None
        self.decoded_neighborhood = None
        self.neighb_predictions = None
        self.dt_surrogate = None
        self.encoded_feature_names = None
        
    def reset_dataset_state(self) -> None:
        """
        Reset dataset-related state when switching to a new dataset.
        
        This ensures that all components dependent on the dataset
        are cleared and will be reinitialized.
        """
        self.reset_explanation_components()
        self.bbox = None
        self.descriptor = None
        self.X = None
        self.y = None
        self.dataset = None
        self.dataset_name = None
        self.feature_names = None
        self.target_names = None
        
    def update_dimensionality_reduction_parameters(self, parameters: Dict[str, Dict[str, Any]]) -> None:
        """
        Update Dimensionality Reduction techniques Parameters for all methods.
        
        Parameters
        ----------
        parameters : Dict[str, Dict[str, Any]]
            Parameters organized by method name (UMAP, PCA, t-SNE, MDS).
        """
        if parameters:
            for method, method_params in parameters.items():
                if method in self.dimensionality_reduction_parameters:
                    self.dimensionality_reduction_parameters[method].update(method_params)
    
    def get_dimensionality_reduction_parameters(self, method: str = None) -> Dict[str, Any]:
        """
        Get Dimensionality Reduction techniques Parameters for a specific method or all methods.
        
        Parameters
        ----------
        method : str, optional
            Specific method to get parameters for. If None, returns all parameters.
            
        Returns
        -------
        Dict[str, Any]
            Parameters for the specified method, or all methods if method is None.
        """
        if method:
            return self.dimensionality_reduction_parameters.get(method.upper(), {})
        return self.dimensionality_reduction_parameters.copy()


webapp_state = WebappState()
