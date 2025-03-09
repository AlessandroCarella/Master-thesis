import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from scipy.spatial import Voronoi
from shapely.geometry import Polygon
from shapely.ops import unary_union
import networkx as nx
from sklearn.cluster import KMeans

def preprocess_data(X, method, n_components=2, random_state=42, **kwargs):
    """
    Standardize the data and apply dimensionality reduction (PCA or t-SNE).
    
    Parameters:
    -----------
    X : array-like
        Input features
    method : str, default='pca'
        Dimensionality reduction method ('pca' or 'tsne')
    n_components : int, default=2
        Number of components
    random_state : int, default=42
        Random state for reproducibility
    **kwargs : dict
        Additional keyword arguments for the dimensionality reduction method
        
    Returns:
    --------
    tuple
        (transformed_data, model, scaler_model)
    """
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    if method.lower() == 'pca':
        model = PCA(n_components=n_components)
        X_transformed = model.fit_transform(X_scaled)
    elif method.lower() == 'tsne':
        # Default t-SNE parameters
        tsne_params = {
            'perplexity': 30.0,
            'early_exaggeration': 12.0,
            'learning_rate': 'auto',
            'n_iter': 1000,
            'n_iter_without_progress': 300
        }
        # Update with any provided kwargs
        tsne_params.update(kwargs)
        
        model = TSNE(n_components=n_components, random_state=random_state, **tsne_params)
        X_transformed = model.fit_transform(X_scaled)
    else:
        raise ValueError(f"Unsupported method: {method}. Use 'pca' or 'tsne'.")
    
    return X_transformed, model, scaler

def generate_decision_boundary_grid(X_transformed, step=0.1):
    """
    Generate a grid for decision boundary visualization.
    
    Parameters:
    -----------
    X_transformed : array-like
        Transformed features (PCA or t-SNE)
    step : float, default=0.1
        Step size for the grid
        
    Returns:
    --------
    tuple
        (xx, yy) meshgrid arrays and (x_min, x_max, y_min, y_max) boundaries
    """
    x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
    y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
    xx, yy = np.meshgrid(
        np.arange(x_min, x_max, step),
        np.arange(y_min, y_max, step)
    )
    return xx, yy, (x_min, x_max, y_min, y_max)

def filter_points_by_class_kmeans(points, original_data, labels, threshold=500, threshold_multiplier=4, random_state=42):
    """
    Filter points using K-means clustering to reduce data density, while preserving the original order.
    
    Instead of stacking by class (which reorders the data), we collect the original indices for each class,
    perform the filtering, and then sort the indices to restore the original ordering.
        
    Parameters:
    -----------
    points : array-like
        Input points to filter
    original_data : array-like
        Original feature data corresponding to points
    labels : array-like
        Class labels for points
    threshold : int, default=500
        Maximum number of points per class
    threshold_multiplier : int, default=4
        Multiplier for initial sampling size
    random_state : int, default=42
        Random state for reproducibility
        
    Returns:
    --------
    tuple
        (filtered_points, filtered_original_data, filtered_labels)
    """
    selected_indices = []
    unique_classes = np.unique(labels)
    
    for cls in unique_classes:
        # Get the indices in the original order for this class.
        class_indices = np.where(labels == cls)[0]
        class_points = points[class_indices]
        n_points = len(class_points)
        
        if n_points > threshold:
            sample_size = min(threshold * threshold_multiplier, n_points)
            rng = np.random.RandomState(random_state)
            sampled_indices_local = rng.choice(n_points, size=sample_size, replace=False)
            sampled_points = class_points[sampled_indices_local]
            
            kmeans = KMeans(n_clusters=threshold, random_state=random_state, n_init=10)
            kmeans.fit(sampled_points)
            centroids = kmeans.cluster_centers_
            
            # For each centroid, choose the point closest to it
            for centroid in centroids:
                distances = np.linalg.norm(class_points - centroid, axis=1)
                closest_local_index = np.argmin(distances)
                # Map back to the original index
                selected_indices.append(class_indices[closest_local_index])
        else:
            selected_indices.extend(class_indices.tolist())
    
    # Sort the indices to maintain original order
    selected_indices = np.sort(selected_indices)
    
    filtered_points = points[selected_indices]
    filtered_original = original_data[selected_indices]
    filtered_labels = labels[selected_indices]
    return filtered_points, filtered_original, filtered_labels

def create_voronoi_regions(xx, yy, Z, class_names):
    """
    Create Voronoi regions for decision boundaries.
    
    Parameters:
    -----------
    xx : array-like
        X coordinates of the grid
    yy : array-like
        Y coordinates of the grid
    Z : array-like
        Predicted classes for the grid points
    class_names : list
        List of class names corresponding to numeric indices
        
    Returns:
    --------
    tuple
        (merged_regions, merged_classes) where merged_classes contains actual class names
    """
    # Identify unique class indices present in Z
    unique_z = np.unique(Z)
    
    # Create a mapping from original class indices to a new contiguous range starting from 0
    # because sometimes some of the classes are missing from the generated neighborhood
    index_map = {old_idx: new_idx for new_idx, old_idx in enumerate(sorted(unique_z))}
    
    # Apply the mapping to remap Z values
    # This ensures the class indices are normalized (starting from 0 and sequential)
    Z_remapped = np.array([index_map[z] for z in Z.ravel()]).reshape(Z.shape)
    
    # Initialize a graph for tracking adjacency of Voronoi regions
    G = nx.Graph()
    
    # Compute the Voronoi diagram from grid coordinates
    vor = Voronoi(np.c_[xx.ravel(), yy.ravel()])
    
    # Extract Voronoi regions and vertices
    regions, vertices = vor.regions, vor.vertices
    
    # Dictionaries to store region information
    region_class_map = {}  # Maps region index to class name
    region_polygons = []    # Stores the actual polygonal regions
    region_class_list = []  # Stores the class names corresponding to each region
    region_index_map = {}   # Maps region index to polygon index
    
    polygon_idx = 0  # Index tracker for polygon storage
    
    # Iterate through Voronoi regions and assign class labels
    for point_index, region_index in enumerate(vor.point_region):
        region = regions[region_index]
        
        # Check for valid region (i.e., does not contain infinite points)
        if not -1 in region and len(region) > 0:
            # Create a polygon for the region using its vertex indices
            polygon = Polygon([vertices[i] for i in region])
            region_polygons.append(polygon)
            
            # Retrieve the remapped class index from Z_remapped
            class_idx = int(Z_remapped.ravel()[point_index])
            
            # Ensure class index is within valid range
            if class_idx < 0 or class_idx >= len(class_names):
                raise ValueError(f"Invalid remapped class index {class_idx} for class_names {class_names}")
            
            # Map region index to class name
            region_class_map[region_index] = class_names[class_idx]
            region_class_list.append(class_names[class_idx])
            
            # Store mapping between Voronoi region index and our polygon index
            region_index_map[region_index] = polygon_idx
            
            # Add region to graph
            G.add_node(region_index)
            
            polygon_idx += 1
    
    # Identify adjacent regions with the same class and add edges to graph
    for (p1, p2), ridge_vertices in zip(vor.ridge_points, vor.ridge_vertices):
        if -1 in ridge_vertices:  # Ignore ridges extending to infinity
            continue
        
        r1, r2 = vor.point_region[p1], vor.point_region[p2]
        
        # Only connect regions if they belong to the same class
        if region_class_map.get(r1) == region_class_map.get(r2):
            G.add_edge(r1, r2)
    
    # Merge connected regions with the same class
    merged_regions = []
    merged_classes = []
    
    for component in nx.connected_components(G):
        # Merge all polygons in the connected component
        merged_polygon = unary_union([
            region_polygons[region_index_map[i]] 
            for i in component 
            if i in region_index_map
        ])
        merged_regions.append(merged_polygon)
        
        # Assign class based on the first region in the component
        merged_classes.append(region_class_map[list(component)[0]])
    
    return merged_regions, merged_classes

def format_pc_label(pc_loadings, feature_names, pc_index):
    """
    Format the principal component label with feature contributions.
    
    Parameters:
    -----------
    pc_loadings : array-like
        Principal component loadings
    feature_names : list
        List of feature names
    pc_index : int
        Index of the principal component
        
    Returns:
    --------
    str
        Formatted label
    """
    return f"PC{pc_index + 1}: " + ", ".join(
        [f"{name} ({value:+.2f})" for name, value in zip(feature_names, pc_loadings)]
    )

def create_scatter_plot_data(feature_names, X, y, pretrained_tree, class_names, method='tsne', step=0.1, random_state=42, **kwargs):
    """
    Generate visualization data and decision boundaries for a pre-trained decision tree
    using either PCA or t-SNE dimensionality reduction.
    
    Parameters:
    -----------
    feature_names : list
        List of feature names
    X : array-like
        Input features
    y : array-like
        Target labels
    pretrained_tree : DecisionTreeClassifier
        Pre-trained decision tree classifier on original (non-PCA) data
    class_names : list
        List of class names
    method : str, default='pca'
        Dimensionality reduction method ('pca' or 'tsne')
    step : float, default=0.1
        Step size for decision boundary grid
    random_state : int, default=42
        Random state for reproducibility
    **kwargs : dict
        Additional parameters for the dimensionality reduction method
        
    Returns:
    --------
    dict
        Visualization data including transformed coordinates, original data, and decision boundaries
    """
    # Transform data
    X_transformed, model, scaler = preprocess_data(X, method=method, random_state=random_state, **kwargs)
    
    # Filter transformed points and original data
    filtered_transformed_data, filtered_original_data, filtered_labels = filter_points_by_class_kmeans(
        X_transformed, X, y, threshold=2000, threshold_multiplier=5, random_state=random_state
    )
    
    # Get data range for visualization
    x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
    y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
    
    # Format axis labels based on the method
    if method.lower() == 'pca':
        x_axis_label = format_pc_label(model.components_[0], feature_names, 0)
        y_axis_label = format_pc_label(model.components_[1], feature_names, 1)
        
        # Generate grid in PCA space
        xx, yy, _ = generate_decision_boundary_grid(X_transformed, step)
        
        # Transform grid points back to original space for prediction
        grid_points = np.c_[xx.ravel(), yy.ravel()]
        grid_original = model.inverse_transform(grid_points)
        grid_original = scaler.inverse_transform(grid_original)
        
        # Get predictions using the pre-trained tree
        Z = pretrained_tree.predict(grid_original).reshape(xx.shape)
        
        # Create Voronoi regions with class names
        merged_regions, merged_classes = create_voronoi_regions(xx, yy, Z, class_names)
        
        # Decision boundary for PCA
        decision_boundary = {
            "regions": [list(p.exterior.coords) for p in merged_regions],
            "regionClasses": merged_classes,
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    else:  # t-SNE
        x_axis_label = "t-SNE dimension 1"
        y_axis_label = "t-SNE dimension 2"
        
        # For t-SNE, still provide the x and y ranges, but no regions/regionClasses
        decision_boundary = {
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        }
    
    # Convert original data to lists of pd.Series
    original_series_list = [
        pd.Series(row, index=feature_names).to_dict()
        for row in filtered_original_data
    ]
    
    # Prepare visualization data
    visualization_data = {
        "transformedData": filtered_transformed_data.tolist(),
        "originalData": original_series_list,
        "targets": filtered_labels.tolist(),
        "decisionBoundary": decision_boundary,
        "xAxisLabel": x_axis_label,
        "yAxisLabel": y_axis_label,
        "method": method,
    }
    
    return visualization_data