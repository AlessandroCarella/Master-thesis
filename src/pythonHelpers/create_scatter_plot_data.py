import numpy as np
import pandas as pd
import logging
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, MDS
from sklearn.cluster import KMeans
from umap import UMAP
from scipy.spatial import Voronoi
from shapely.geometry import Polygon
from shapely.ops import unary_union
import networkx as nx


# ---------------- Data Preprocessing ---------------- #

class DimensionalityReducer:
    """Handles dimensionality reduction for visualization."""
    
    def __init__(self, method='umap', random_state=42):
        self.method = method.lower()
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.reducer = None
    
    def fit_transform(self, X):
        """Apply scaling and dimensionality reduction."""
        X_scaled = self.scaler.fit_transform(X)
        
        if self.method == 'pca':
            self.reducer = PCA(n_components=2)
        elif self.method == 'tsne':
            self.reducer = TSNE(
                n_components=2, 
                random_state=self.random_state,
                perplexity=min(30.0, X_scaled.shape[0] / 3),
                early_exaggeration=12.0,
                learning_rate='auto',
                n_iter=1000,
                n_iter_without_progress=300
            )
        elif self.method == 'umap':
            logging.getLogger('numba').setLevel(logging.WARNING)
            self.reducer = UMAP(n_components=2, random_state=self.random_state)
        elif self.method == 'mds':
            self.reducer = MDS(n_components=2, random_state=self.random_state)
        else:
            raise ValueError(f"Unsupported method: {self.method}")
        
        return self.reducer.fit_transform(X_scaled)
    
    def can_generate_boundary(self):
        """Check if method supports decision boundary generation."""
        return self.method == 'pca'


# ---------------- Data Filtering ---------------- #

class DataFilter:
    """Handles data point filtering using K-means clustering."""
    
    def __init__(self, threshold=2000, multiplier=5, random_state=42):
        self.threshold = threshold
        self.multiplier = multiplier
        self.random_state = random_state
    
    def filter_by_class(self, points, original_data, labels):
        """Filter points by class using K-means clustering."""
        selected_indices = []
        
        for cls in np.unique(labels):
            class_indices = np.where(labels == cls)[0]
            class_points = points[class_indices]
            
            if len(class_points) > self.threshold:
                # Sample and cluster to find representatives
                sample_size = min(self.threshold * self.multiplier, len(class_points))
                rng = np.random.RandomState(self.random_state)
                sampled_indices = rng.choice(len(class_points), size=sample_size, replace=False)
                sampled_points = class_points[sampled_indices]
                
                # Use K-means to find representatives
                n_clusters = min(self.threshold, len(sampled_points))
                kmeans = KMeans(n_clusters=n_clusters, random_state=self.random_state, n_init=10)
                kmeans.fit(sampled_points)
                
                # Find closest points to centroids
                for centroid in kmeans.cluster_centers_:
                    distances = np.linalg.norm(class_points - centroid, axis=1)
                    closest_idx = class_indices[np.argmin(distances)]
                    selected_indices.append(closest_idx)
            else:
                selected_indices.extend(class_indices.tolist())
        
        # Sort indices to maintain original order
        selected_indices = np.sort(selected_indices)
        
        return points[selected_indices], original_data[selected_indices], labels[selected_indices]


# ---------------- Decision Boundary Generation ---------------- #

class DecisionBoundaryGenerator:
    """Generates decision boundaries for PCA visualizations."""
    
    def __init__(self, step=0.1):
        self.step = step
    
    def generate_for_pca(self, X_transformed, reducer, scaler, model, class_names):
        """Generate decision boundary regions for PCA."""
        # Create grid
        x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
        y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
        xx, yy = np.meshgrid(
            np.arange(x_min, x_max, self.step),
            np.arange(y_min, y_max, self.step)
        )
        
        # Transform grid back to original space for prediction
        grid_points = np.c_[xx.ravel(), yy.ravel()]
        grid_original = reducer.inverse_transform(grid_points)
        grid_original = scaler.inverse_transform(grid_original)
        Z = model.predict(grid_original).reshape(xx.shape)
        
        # Create Voronoi regions
        regions, region_classes = self._create_voronoi_regions(xx, yy, Z, class_names)
        
        return {
            "regions": [list(p.exterior.coords) for p in regions],
            "regionClasses": region_classes,
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    
    def generate_basic_bounds(self, X_transformed):
        """Generate basic boundary information for non-PCA methods."""
        x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
        y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
        
        return {
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    
    def _create_voronoi_regions(self, xx, yy, Z, class_names):
        """Create Voronoi regions from prediction grid."""
        # Create class mapping
        unique_classes = np.unique(Z)
        class_map = {old: new for new, old in enumerate(sorted(unique_classes))}
        Z_remapped = np.array([class_map[z] for z in Z.ravel()]).reshape(Z.shape)
        
        # Compute Voronoi diagram
        vor = Voronoi(np.c_[xx.ravel(), yy.ravel()])
        
        # Process regions
        G = nx.Graph()
        region_class_map = {}
        region_polygons = []
        region_index_map = {}
        polygon_idx = 0
        
        for point_index, region_index in enumerate(vor.point_region):
            region = vor.regions[region_index]
            
            if self._is_valid_region(region):
                # Create polygon
                polygon = Polygon([vor.vertices[i] for i in region])
                region_polygons.append(polygon)
                
                class_idx = int(Z_remapped.ravel()[point_index])
                if class_idx >= len(class_names):
                    continue
                
                region_class_map[region_index] = class_names[class_idx]
                region_index_map[region_index] = polygon_idx
                G.add_node(region_index)
                polygon_idx += 1
        
        # Add adjacency edges for same-class regions
        for (p1, p2), ridge_vertices in zip(vor.ridge_points, vor.ridge_vertices):
            if -1 in ridge_vertices:
                continue
            r1, r2 = vor.point_region[p1], vor.point_region[p2]
            if region_class_map.get(r1) == region_class_map.get(r2):
                G.add_edge(r1, r2)
        
        # Merge connected regions
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
    
    def _is_valid_region(self, region):
        """Check if Voronoi region is valid."""
        return -1 not in region and len(region) > 0


# ---------------- Feature Processing ---------------- #

class FeatureProcessor:
    """Handles feature data processing and conversion."""
    
    @staticmethod
    def combine_datasets(X, y, X_original=None, y_original=None):
        """Combine original and neighborhood datasets."""
        if X_original is not None and y_original is not None:
            original_flags = [True] * len(X_original) + [False] * len(X)
            X_combined = np.vstack((X_original, X))
            y_combined = np.concatenate((y_original, y))
            return X_combined, y_combined, original_flags
        else:
            original_flags = [False] * len(X)
            return X, y, original_flags
    
    @staticmethod
    def convert_to_feature_dicts(data_array, feature_names):
        """Convert data arrays to feature dictionaries using encoded feature names."""
        if feature_names is None:
            return data_array.tolist()
        
        data_array = data_array.values if hasattr(data_array, 'values') else data_array
        feature_dicts = []
        
        for row in data_array:
            feature_dict = {}
            for j, feature_name in enumerate(feature_names):  # feature_names should be encoded names
                if j < len(row):
                    value = row[j]
                    # Convert numpy types for JSON serialization
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
    def update_original_flags(original_flags, filtered_labels, X_original):
        """Update original flags after filtering."""
        if X_original is not None:
            original_count = len(X_original)
            return [i < original_count for i in range(len(filtered_labels))]
        return [False] * len(filtered_labels)


# ---------------- Main Visualization Pipeline ---------------- #

class ScatterPlotGenerator:
    """Main class for generating scatter plot visualization data."""
    
    def __init__(self, method='umap', step=0.1, random_state=42):
        self.reducer = DimensionalityReducer(method, random_state)
        self.filter = DataFilter(random_state=random_state)
        self.boundary_gen = DecisionBoundaryGenerator(step)
        self.feature_proc = FeatureProcessor()
    
    def generate(self, X, y, pretrained_tree, class_names, feature_names=None, 
                 X_original=None, y_original=None):
        """Generate complete scatter plot visualization data."""
        
        # Combine datasets
        X_combined, y_combined, original_flags = self.feature_proc.combine_datasets(
            X, y, X_original, y_original
        )
        
        # Apply dimensionality reduction
        X_transformed = self.reducer.fit_transform(X_combined)
        
        # Filter data points
        X_filtered, X_original_filtered, y_filtered = self.filter.filter_by_class(
            X_transformed, X_combined, y_combined
        )
        
        # Generate decision boundary
        if self.reducer.can_generate_boundary():
            decision_boundary = self.boundary_gen.generate_for_pca(
                X_transformed, self.reducer.reducer, self.reducer.scaler, 
                pretrained_tree, class_names
            )
        else:
            decision_boundary = self.boundary_gen.generate_basic_bounds(X_transformed)
        
        # Convert to feature dictionaries
        original_data_dicts = self.feature_proc.convert_to_feature_dicts(
            X_original_filtered, feature_names
        )
        
        # Update original flags
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


# ---------------- Main Interface Function ---------------- #

def create_scatter_plot_data_raw(X, y, pretrained_tree, class_names, feature_names=None, 
                                X_original=None, y_original=None, method='umap', 
                                step=0.1, random_state=42):
    """
    Main interface function for generating scatter plot visualization data.
    
    Parameters:
    -----------
    X : array-like
        Feature data (encoded format)
    y : array-like
        Target labels
    pretrained_tree : sklearn model
        Trained decision tree for boundary generation
    class_names : list
        List of class names
    feature_names : list, optional
        List of encoded feature names
    X_original : array-like, optional
        Original training data
    y_original : array-like, optional
        Original training labels
    method : str, default='umap'
        Dimensionality reduction method ('pca', 'tsne', 'umap', 'mds')
    step : float, default=0.1
        Step size for decision boundary grid
    random_state : int, default=42
        Random state for reproducibility
        
    Returns:
    --------
    dict
        Visualization data dictionary containing transformed points, decision boundaries,
        and metadata for frontend rendering
    """
    generator = ScatterPlotGenerator(method, step, random_state)
    return generator.generate(X, y, pretrained_tree, class_names, feature_names, 
                             X_original, y_original)
