from typing import List, Tuple, Dict, Any, Optional, Union
import numpy as np
import pandas as pd
import logging
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from scipy.spatial import Voronoi
from shapely.geometry import Polygon
from shapely.ops import unary_union
import networkx as nx

from .webapp_dimensionality_reduction_utils import create_dimensionality_reducer, can_generate_boundary


class DimensionalityReducer:
    """
    Handles dimensionality reduction for high-dimensional data visualization.
    
    Parameters
    ----------
    method : str, default='umap'
        Reduction method ('pca', 'tsne', 'umap', 'mds').
    parameters : dict, default=None
        Method-specific parameters.
    random_state : int, default=42
        Random seed for reproducible results.
        
    Attributes
    ----------
    method : str
        Selected dimensionality reduction method.
    parameters : dict
        Method-specific parameters.
    random_state : int
        Random seed value.
    scaler : StandardScaler
        Feature standardization transformer.
    reducer : Any
        Fitted dimensionality reduction model.
    """
    
    def __init__(self, method: str = 'umap', parameters: dict = None, random_state: int = 42) -> None:
        """Initialize dimensionality reducer with specified method and parameters."""
        self.method = method.lower()
        self.parameters = parameters or {}
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.reducer = None
    
    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """
        Fit reducer and transform data to 2D coordinates.
        
        Parameters
        ----------
        X : np.ndarray
            High-dimensional input data with shape (n_samples, n_features).
            
        Returns
        -------
        np.ndarray
            2D transformed coordinates with shape (n_samples, 2).
            
        Raises
        ------
        ValueError
            If unsupported reduction method is specified.
        """
        X_scaled = self.scaler.fit_transform(X)
        
        self.reducer = create_dimensionality_reducer(
            self.method, 
            n_components=2, 
            parameters=self.parameters, 
            random_state=self.random_state,
            X_scaled=X_scaled
        )
        
        return self.reducer.fit_transform(X_scaled)
    
    def can_generate_boundary(self) -> bool:
        """
        Check if method supports decision boundary generation.
        
        Returns
        -------
        bool
            True if method supports inverse transformation for boundaries.
            
        Notes
        -----
        Only PCA currently supports decision boundary generation due to
        its linear and invertible nature.
        """
        return can_generate_boundary(self.method)


class DataFilter:
    """
    Filters large datasets to manageable sizes for visualization.
    
    Parameters
    ----------
    threshold : int, default=2000
        Maximum points per class to retain.
    multiplier : int, default=5
        Oversampling factor for clustering-based selection.
    random_state : int, default=42
        Random seed for reproducible filtering.
        
    Attributes
    ----------
    threshold : int
        Point limit per class.
    multiplier : int
        Clustering oversampling factor.
    random_state : int
        Random seed value.
    """
    
    def __init__(self, threshold: int = 2000, multiplier: int = 5, random_state: int = 42) -> None:
        """Initialize data filter with specified parameters."""
        self.threshold = threshold
        self.multiplier = multiplier
        self.random_state = random_state
    
    def filter_by_class(self, points: np.ndarray, original_data: np.ndarray, 
                       labels: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Filter data points by class to reduce visualization complexity.
        
        Parameters
        ----------
        points : np.ndarray
            2D coordinates for visualization.
        original_data : np.ndarray
            Original high-dimensional feature data.
        labels : np.ndarray
            Class labels for each point.
            
        Returns
        -------
        Tuple[np.ndarray, np.ndarray, np.ndarray]
            Filtered points, original data, and labels.
            
        Notes
        -----
        For large classes, uses K-means clustering to select representative
        points closest to cluster centroids. Preserves all points for small classes.
        """
        selected_indices = []
        
        for cls in np.unique(labels):
            class_indices = np.where(labels == cls)[0]
            class_points = points[class_indices]
            
            if len(class_points) > self.threshold:
                sample_size = min(self.threshold * self.multiplier, len(class_points))
                rng = np.random.RandomState(self.random_state)
                sampled_indices = rng.choice(len(class_points), size=sample_size, replace=False)
                sampled_points = class_points[sampled_indices]
                
                n_clusters = min(self.threshold, len(sampled_points))
                kmeans = KMeans(n_clusters=n_clusters, random_state=self.random_state, n_init=10)
                kmeans.fit(sampled_points)
                
                for centroid in kmeans.cluster_centers_:
                    distances = np.linalg.norm(class_points - centroid, axis=1)
                    closest_idx = class_indices[np.argmin(distances)]
                    selected_indices.append(closest_idx)
            else:
                selected_indices.extend(class_indices.tolist())
        
        selected_indices = np.sort(selected_indices)
        
        return points[selected_indices], original_data[selected_indices], labels[selected_indices]


class DecisionBoundaryGenerator:
    """
    Generates decision boundaries for visualization of model decisions.
    
    Parameters
    ----------
    step : float, default=0.1
        Grid resolution for boundary mesh generation.
        
    Attributes
    ----------
    step : float
        Mesh step size for boundary calculation.
    """
    
    def __init__(self, step: float = 0.1) -> None:
        """Initialize boundary generator with specified step size."""
        self.step = step
    
    def generate_for_pca(self, X_transformed: np.ndarray, reducer: Any, scaler: Any, 
                        model: Any, class_names: List[str]) -> Dict[str, Any]:
        """
        Generate decision boundaries for PCA-transformed data.
        
        Parameters
        ----------
        X_transformed : np.ndarray
            2D PCA-transformed coordinates.
        reducer : Any
            Fitted PCA reducer for inverse transformation.
        scaler : Any
            Fitted scaler for inverse transformation.
        model : Any
            Trained model for boundary prediction.
        class_names : List[str]
            Names of prediction classes.
            
        Returns
        -------
        Dict[str, Any]
            Decision boundary regions with class assignments and coordinate ranges.
            
        Notes
        -----
        Creates dense grid in 2D space, transforms back to original space
        for model prediction, then generates Voronoi regions for visualization.
        """
        x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
        y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
        xx, yy = np.meshgrid(
            np.arange(x_min, x_max, self.step),
            np.arange(y_min, y_max, self.step)
        )
        
        grid_points = np.c_[xx.ravel(), yy.ravel()]
        grid_original = reducer.inverse_transform(grid_points)
        grid_original = scaler.inverse_transform(grid_original)
        Z = model.dt.predict(grid_original).reshape(xx.shape)
        
        regions, region_classes = self._create_voronoi_regions(xx, yy, Z, class_names)
        
        return {
            "regions": [list(p.exterior.coords) for p in regions],
            "regionClasses": region_classes,
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    
    def generate_basic_bounds(self, X_transformed: np.ndarray) -> Dict[str, List[float]]:
        """
        Generate basic coordinate bounds without decision boundaries.
        
        Parameters
        ----------
        X_transformed : np.ndarray
            2D transformed coordinates.
            
        Returns
        -------
        Dict[str, List[float]]
            X and Y coordinate ranges for plot bounds.
        """
        x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
        y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
        
        return {
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    
    def _create_voronoi_regions(self, xx: np.ndarray, yy: np.ndarray, Z: np.ndarray, 
                              class_names: List[str]) -> Tuple[List[Polygon], List[str]]:
        """
        Create Voronoi regions for decision boundary visualization.
        
        Parameters
        ----------
        xx : np.ndarray
            X coordinates mesh grid.
        yy : np.ndarray
            Y coordinates mesh grid.
        Z : np.ndarray
            Predicted class labels for grid points.
        class_names : List[str]
            Names of prediction classes.
            
        Returns
        -------
        Tuple[List[Polygon], List[str]]
            Merged polygon regions and their corresponding class names.
            
        Notes
        -----
        Uses graph connectivity to merge adjacent Voronoi cells
        with same class predictions into unified regions.
        """
        unique_classes = np.unique(Z)
        class_map = {old: new for new, old in enumerate(sorted(unique_classes))}
        Z_remapped = np.array([class_map[z] for z in Z.ravel()]).reshape(Z.shape)
        
        vor = Voronoi(np.c_[xx.ravel(), yy.ravel()])
        
        G = nx.Graph()
        region_class_map = {}
        region_polygons = []
        region_index_map = {}
        polygon_idx = 0
        
        for point_index, region_index in enumerate(vor.point_region):
            region = vor.regions[region_index]
            
            if self._is_valid_region(region):
                polygon = Polygon([vor.vertices[i] for i in region])
                region_polygons.append(polygon)
                
                class_idx = int(Z_remapped.ravel()[point_index])
                if class_idx >= len(class_names):
                    continue
                
                region_class_map[region_index] = class_names[class_idx]
                region_index_map[region_index] = polygon_idx
                G.add_node(region_index)
                polygon_idx += 1
        
        for (p1, p2), ridge_vertices in zip(vor.ridge_points, vor.ridge_vertices):
            if -1 in ridge_vertices:
                continue
            r1, r2 = vor.point_region[p1], vor.point_region[p2]
            if region_class_map.get(r1) == region_class_map.get(r2):
                G.add_edge(r1, r2)
        
        merged_regions = []
        merged_classes = []
        
        for component in nx.connected_components(G):
            merged_polygon = unary_union([
                region_polygons[region_index_map[i]] 
                for i in component 
                if i in region_index_map
            ])
            merged_regions.append(merged_polygon)
            merged_classes.append(region_class_map[list(component)[0]])
        
        return merged_regions, merged_classes
    
    def _is_valid_region(self, region: List[int]) -> bool:
        """
        Check if Voronoi region is valid for polygon creation.
        
        Parameters
        ----------
        region : List[int]
            Vertex indices defining the region.
            
        Returns
        -------
        bool
            True if region has valid vertices and no infinite boundaries.
        """
        return -1 not in region and len(region) > 0


class FeatureProcessor:
    """Processes and converts feature data for visualization."""
    
    @staticmethod
    def combine_datasets(X: np.ndarray, y: np.ndarray, X_original: np.ndarray = None, 
                        y_original: np.ndarray = None) -> Tuple[np.ndarray, np.ndarray, List[bool]]:
        """
        Combine neighborhood and original training datasets.
        
        Parameters
        ----------
        X : np.ndarray
            Neighborhood feature matrix.
        y : np.ndarray
            Neighborhood labels.
        X_original : np.ndarray
            Original training features.
        y_original : np.ndarray
            Original training labels.
            
        Returns
        -------
        Tuple[np.ndarray, np.ndarray, List[bool]]
            Combined features, labels, and flags indicating original data points.
        """
        if X_original is not None and y_original is not None:
            original_flags = [True] * len(X_original) + [False] * len(X)
            X_combined = np.vstack((X_original, X))
            y_combined = np.concatenate((y_original, y))
            return X_combined, y_combined, original_flags
        else:
            original_flags = [False] * len(X)
            return X, y, original_flags
    
    @staticmethod
    def convert_to_feature_dicts(data_array: Union[np.ndarray, pd.DataFrame], 
                               feature_names: List[str]) -> Union[List[List], List[Dict[str, Any]]]:
        """
        Convert array data to feature dictionaries for frontend consumption.
        
        Parameters
        ----------
        data_array : Union[np.ndarray, pd.DataFrame]
            Feature data to convert.
        feature_names : List[str]
            Names for features, if None returns raw lists.
            
        Returns
        -------
        Union[List[List], List[Dict[str, Any]]]
            Feature data as dictionaries or lists based on feature_names availability.
            
        Notes
        -----
        Handles NumPy type conversion for JSON serialization.
        Maps feature values to encoded feature names when available.
        """
        if feature_names is None:
            return data_array.tolist()
        
        data_array = data_array.values if hasattr(data_array, 'values') else data_array
        feature_dicts = []
        
        for row in data_array:
            feature_dict = {}
            for j, feature_name in enumerate(feature_names):
                if j < len(row):
                    value = row[j]
                    if isinstance(value, (np.integer, np.int64, np.int32)):
                        feature_dict[feature_name] = int(value)
                    elif isinstance(value, (np.floating, np.float64, np.float32)):
                        feature_dict[feature_name] = float(value)
                    elif isinstance(value, np.ndarray):
                        item = value.item() if value.size == 1 else value[0]
                        if isinstance(item, (np.integer, np.int64, np.int32)):
                            feature_dict[feature_name] = int(item)
                        elif isinstance(item, (np.floating, np.float64, np.float32)):
                            feature_dict[feature_name] = float(item)
                        else:
                            feature_dict[feature_name] = item
                    else:
                        feature_dict[feature_name] = value
                else:
                    feature_dict[feature_name] = 0.0
            feature_dicts.append(feature_dict)
        
        return feature_dicts
    
    @staticmethod
    def update_original_flags(original_flags: List[bool], filtered_labels: np.ndarray, 
                            X_original: np.ndarray) -> List[bool]:
        """
        Update original data flags after filtering operations.
        
        Parameters
        ----------
        original_flags : List[bool]
            Original flags before filtering.
        filtered_labels : np.ndarray
            Labels after filtering.
        X_original : np.ndarray
            Original training data.
            
        Returns
        -------
        List[bool]
            Updated flags indicating which points are from original dataset.
        """
        if X_original is not None:
            original_count = len(X_original)
            return [i < original_count for i in range(len(filtered_labels))]
        return [False] * len(filtered_labels)


class ScatterPlotGenerator:
    """
    Main class orchestrating scatter plot visualization generation.
    
    Parameters
    ----------
    method : str, default='umap'
        Dimensionality reduction method.
    parameters : dict, default=None
        Method-specific parameters.
    step : float, default=0.1
        Decision boundary mesh resolution.
    random_state : int, default=42
        Random seed for reproducible results.
        
    Attributes
    ----------
    reducer : DimensionalityReducer
        Dimensionality reduction component.
    filter : DataFilter
        Data filtering component.
    boundary_gen : DecisionBoundaryGenerator
        Decision boundary generation component.
    feature_proc : FeatureProcessor
        Feature processing utilities.
    """
    
    def __init__(self, method: str = 'umap', parameters: dict = None, step: float = 0.1, random_state: int = 42) -> None:
        """Initialize scatter plot generator with specified parameters."""
        self.reducer = DimensionalityReducer(method, parameters, random_state)
        self.filter = DataFilter(random_state=random_state)
        self.boundary_gen = DecisionBoundaryGenerator(step)
        self.feature_proc = FeatureProcessor()
    
    def generate(self, X: np.ndarray, y: np.ndarray, pretrained_tree: Any, 
                class_names: List[str], feature_names: List[str] = None, 
                X_original: np.ndarray = None, y_original: np.ndarray = None) -> Dict[str, Any]:
        """
        Generate complete scatter plot visualization data.
        
        Parameters
        ----------
        X : np.ndarray
            Neighborhood feature matrix.
        y : np.ndarray
            Neighborhood predictions.
        pretrained_tree : Any
            Trained surrogate model for decision boundaries.
        class_names : List[str]
            Names of prediction classes.
        feature_names : List[str]
            Encoded feature names.
        X_original : np.ndarray
            Original training features.
        y_original : np.ndarray
            Original training labels.
            
        Returns
        -------
        Dict[str, Any]
            Complete visualization data including transformed coordinates,
            decision boundaries, and original data mappings.
        """
        X_combined, y_combined, original_flags = self.feature_proc.combine_datasets(
            X, y, X_original, y_original
        )
        
        X_transformed = self.reducer.fit_transform(X_combined)
        
        X_filtered, X_original_filtered, y_filtered = self.filter.filter_by_class(
            X_transformed, X_combined, y_combined
        )
        
        if self.reducer.can_generate_boundary():
            decision_boundary = self.boundary_gen.generate_for_pca(
                X_transformed, self.reducer.reducer, self.reducer.scaler, 
                pretrained_tree, class_names
            )
        else:
            decision_boundary = self.boundary_gen.generate_basic_bounds(X_transformed)
        
        original_data_dicts = self.feature_proc.convert_to_feature_dicts(
            X_original_filtered, feature_names
        )
        
        original_flags_filtered = self.feature_proc.update_original_flags(
            original_flags, y_filtered, X_original
        )
        
        return {
            "transformedData": X_filtered.tolist(),
            "originalData": original_data_dicts,
            "targets": y_filtered.tolist(),
            "decisionBoundary": decision_boundary,
            "method": self.reducer.method,
            "originalPointsNeighPointsBoolArray": original_flags_filtered,
        }


def create_scatter_plot_data_raw(X: np.ndarray, y: np.ndarray, pretrained_tree: Any, 
                               class_names: List[str], feature_names: List[str] = None, 
                               X_original: np.ndarray = None, y_original: np.ndarray = None, 
                               method: str = 'umap', parameters: dict = None, step: float = 0.1, 
                               random_state: int = 42) -> Dict[str, Any]:
    """
    Main interface function for creating scatter plot visualization data.
    
    Parameters
    ----------
    X : np.ndarray
        Neighborhood feature matrix with shape (n_samples, n_features).
    y : np.ndarray
        Neighborhood predictions with shape (n_samples,).
    pretrained_tree : Any
        Trained surrogate model for decision boundary generation.
    class_names : List[str]
        Names of prediction classes for labeling.
    feature_names : List[str]
        Names of encoded features for data mapping.
    X_original : np.ndarray
        Original training dataset features.
    y_original : np.ndarray
        Original training dataset labels.
    method : str, default='umap'
        Dimensionality reduction method ('pca', 'tsne', 'umap', 'mds').
    parameters : dict, default=None
        Method-specific parameters for dimensionality reduction.
    step : float, default=0.1
        Resolution for decision boundary mesh generation.
    random_state : int, default=42
        Random seed for reproducible results.
        
    Returns
    -------
    Dict[str, Any]
        Complete scatter plot visualization data including:
        - transformedData: 2D coordinates for plotting
        - originalData: Feature dictionaries for tooltip display
        - targets: Class labels for coloring
        - decisionBoundary: Boundary regions (if available)
        - method: Reduction method used
        - originalPointsNeighPointsBoolArray: Flags for data source
        
    Notes
    -----
    This function orchestrates the complete pipeline from high-dimensional
    feature data to 2D visualization with decision boundaries and interactive
    data mappings for frontend consumption.
    """
    generator = ScatterPlotGenerator(method, parameters, step, random_state)
    return generator.generate(X, y, pretrained_tree, class_names, feature_names, 
                             X_original, y_original)
