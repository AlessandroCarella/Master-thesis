import numpy as np
import pandas as pd
import logging

# ---------------- Dimensionality Reduction ---------------- #

def apply_pca_reduction(X_scaled, random_state):
    """Apply PCA dimensionality reduction."""
    from sklearn.decomposition import PCA
    model = PCA(n_components=2)
    X_transformed = model.fit_transform(X_scaled)
    return X_transformed, model

def apply_tsne_reduction(X_scaled, random_state):
    """Apply t-SNE dimensionality reduction with appropriate parameters."""
    from sklearn.manifold import TSNE
    
    tsne_params = {
        'perplexity': min(30.0, X_scaled.shape[0] / 3),
        'early_exaggeration': 12.0,
        'learning_rate': 'auto',
        'n_iter': 1000,
        'n_iter_without_progress': 300
    }
    model = TSNE(n_components=2, random_state=random_state, **tsne_params)
    X_transformed = model.fit_transform(X_scaled)
    return X_transformed, model

def apply_umap_reduction(X_scaled, random_state):
    """Apply UMAP dimensionality reduction."""
    # Set numba logging to warning to reduce startup noise
    logging.getLogger('numba').setLevel(logging.WARNING)
    from umap import UMAP
    
    model = UMAP(n_components=2, random_state=random_state)
    X_transformed = model.fit_transform(X_scaled)
    return X_transformed, model

def apply_mds_reduction(X_scaled, random_state):
    """Apply MDS dimensionality reduction."""
    from sklearn.manifold import MDS
    model = MDS(n_components=2, random_state=random_state)
    X_transformed = model.fit_transform(X_scaled)
    return X_transformed, model

def preprocess_data(X, method, random_state):
    """
    Standardize the data and apply dimensionality reduction (PCA, t-SNE, UMAP, or MDS).
    
    Parameters:
    -----------
    X : array-like
        Input features
    method : str
        Dimensionality reduction method ('pca', 'tsne', 'umap', or 'mds')
    n_components : int, default=2
        Number of components
    random_state : int, default=42
        Random state for reproducibility
        
    Returns:
    --------
    tuple
        (transformed_data, model, scaler_model)
    """
    from sklearn.preprocessing import StandardScaler
    
    # Standardize the data
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Apply appropriate dimensionality reduction method
    method_lower = method.lower()
    
    if method_lower == 'pca':
        X_transformed, model = apply_pca_reduction(X_scaled, random_state)
    elif method_lower == 'tsne':
        X_transformed, model = apply_tsne_reduction(X_scaled, random_state)
    elif method_lower == 'umap':
        X_transformed, model = apply_umap_reduction(X_scaled, random_state)
    elif method_lower == 'mds':
        X_transformed, model = apply_mds_reduction(X_scaled, random_state)
    else:
        raise ValueError(f"Unsupported method: {method}. Use 'pca', 'tsne', 'umap', or 'mds'.")
    
    return X_transformed, model, scaler

# ---------------- Grid Generation for Decision Boundaries ---------------- #

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

# ---------------- Data Filtering ---------------- #

def sample_class_points(class_points, threshold, threshold_multiplier, random_state):
    """Sample points from a class if it exceeds the threshold."""
    n_points = len(class_points)
    sample_size = min(threshold * threshold_multiplier, n_points)
    rng = np.random.RandomState(random_state)
    sampled_indices = rng.choice(n_points, size=sample_size, replace=False)
    return class_points[sampled_indices]

def find_representative_points_kmeans(sampled_points, class_points, threshold, random_state):
    """Find representative points using K-means clustering."""
    from sklearn.cluster import KMeans
    
    kmeans = KMeans(n_clusters=threshold, random_state=random_state, n_init=10)
    kmeans.fit(sampled_points)
    centroids = kmeans.cluster_centers_
    
    # For each centroid, choose the point closest to it
    selected_local_indices = []
    for centroid in centroids:
        distances = np.linalg.norm(class_points - centroid, axis=1)
        closest_local_index = np.argmin(distances)
        selected_local_indices.append(closest_local_index)
    
    return selected_local_indices

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
        # Get the indices in the original order for this class
        class_indices = np.where(labels == cls)[0]
        class_points = points[class_indices]
        n_points = len(class_points)
        
        if n_points > threshold:
            # Sample and cluster to find representatives
            sampled_points = sample_class_points(class_points, threshold, threshold_multiplier, random_state)
            selected_local_indices = find_representative_points_kmeans(sampled_points, class_points, threshold, random_state)
            
            # Map back to original indices
            for local_idx in selected_local_indices:
                selected_indices.append(class_indices[local_idx])
        else:
            selected_indices.extend(class_indices.tolist())
    
    # Sort the indices to maintain original order
    selected_indices = np.sort(selected_indices)
    
    filtered_points = points[selected_indices]
    filtered_original = original_data[selected_indices]
    filtered_labels = labels[selected_indices]
    return filtered_points, filtered_original, filtered_labels

# ---------------- Voronoi Region Processing ---------------- #

def create_class_index_mapping(Z):
    """Create mapping from original class indices to contiguous range."""
    unique_z = np.unique(Z)
    return {old_idx: new_idx for new_idx, old_idx in enumerate(sorted(unique_z))}

def remap_class_indices(Z, index_map):
    """Remap class indices to be contiguous starting from 0."""
    return np.array([index_map[z] for z in Z.ravel()]).reshape(Z.shape)

def extract_voronoi_regions_and_vertices(vor):
    """Extract regions and vertices from Voronoi diagram."""
    return vor.regions, vor.vertices

def create_region_polygon(vertices, region):
    """Create a polygon from Voronoi region vertices."""
    from shapely.geometry import Polygon
    return Polygon([vertices[i] for i in region])

def is_valid_voronoi_region(region):
    """Check if Voronoi region is valid (no infinite points and has vertices)."""
    return not -1 in region and len(region) > 0

def process_voronoi_regions(vor, Z_remapped, class_names):
    """
    Process Voronoi regions to create polygons and class mappings.
    
    Returns region information including polygons, class mappings, and adjacency graph.
    """
    import networkx as nx
    
    regions, vertices = extract_voronoi_regions_and_vertices(vor)
    
    # Initialize storage structures
    G = nx.Graph()
    region_class_map = {}
    region_polygons = []
    region_class_list = []
    region_index_map = {}
    polygon_idx = 0
    
    # Process each Voronoi region
    for point_index, region_index in enumerate(vor.point_region):
        region = regions[region_index]
        
        if is_valid_voronoi_region(region):
            # Create polygon and get class information
            polygon = create_region_polygon(vertices, region)
            region_polygons.append(polygon)
            
            class_idx = int(Z_remapped.ravel()[point_index])
            
            # Validate class index
            if class_idx < 0 or class_idx >= len(class_names):
                raise ValueError(f"Invalid remapped class index {class_idx} for class_names {class_names}")
            
            # Store mappings
            region_class_map[region_index] = class_names[class_idx]
            region_class_list.append(class_names[class_idx])
            region_index_map[region_index] = polygon_idx
            
            G.add_node(region_index)
            polygon_idx += 1
    
    return G, region_class_map, region_polygons, region_index_map

def add_adjacency_edges(G, vor, region_class_map):
    """Add edges between adjacent regions with the same class."""
    for (p1, p2), ridge_vertices in zip(vor.ridge_points, vor.ridge_vertices):
        if -1 in ridge_vertices:  # Ignore ridges extending to infinity
            continue
        
        r1, r2 = vor.point_region[p1], vor.point_region[p2]
        
        # Only connect regions if they belong to the same class
        if region_class_map.get(r1) == region_class_map.get(r2):
            G.add_edge(r1, r2)

def merge_connected_regions(G, region_polygons, region_index_map, region_class_map):
    """Merge connected regions with the same class."""
    from shapely.ops import unary_union
    import networkx as nx
    
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
    from scipy.spatial import Voronoi
    
    # Create class index mapping and remap Z values
    index_map = create_class_index_mapping(Z)
    Z_remapped = remap_class_indices(Z, index_map)
    
    # Compute Voronoi diagram
    vor = Voronoi(np.c_[xx.ravel(), yy.ravel()])
    
    # Process regions and create adjacency graph
    G, region_class_map, region_polygons, region_index_map = process_voronoi_regions(vor, Z_remapped, class_names)
    
    # Add adjacency edges for same-class regions
    add_adjacency_edges(G, vor, region_class_map)
    
    # Merge connected regions
    merged_regions, merged_classes = merge_connected_regions(G, region_polygons, region_index_map, region_class_map)
    
    return merged_regions, merged_classes

# ---------------- Decision Boundary Generation ---------------- #

def generate_pca_decision_boundary(X_transformed, model, scaler, pretrained_tree, class_names, step):
    """Generate decision boundary for PCA visualization."""
    xx, yy, bounds = generate_decision_boundary_grid(X_transformed, step)
    
    # Transform grid points back to original space for prediction
    grid_points = np.c_[xx.ravel(), yy.ravel()]
    grid_original = model.inverse_transform(grid_points)
    grid_original = scaler.inverse_transform(grid_original)
    Z = pretrained_tree.predict(grid_original).reshape(xx.shape)
    
    # Create Voronoi regions
    merged_regions, merged_classes = create_voronoi_regions(xx, yy, Z, class_names)
    
    x_min, x_max, y_min, y_max = bounds
    return {
        "regions": [list(p.exterior.coords) for p in merged_regions],
        "regionClasses": merged_classes,
        "xRange": [float(x_min), float(x_max)],
        "yRange": [float(y_min), float(y_max)],
    }

def generate_basic_decision_boundary(X_transformed):
    """Generate basic decision boundary information for non-PCA methods."""
    x_min, x_max = X_transformed[:, 0].min() - 1, X_transformed[:, 0].max() + 1
    y_min, y_max = X_transformed[:, 1].min() - 1, X_transformed[:, 1].max() + 1
    
    return {
        "xRange": [float(x_min), float(x_max)],
        "yRange": [float(y_min), float(y_max)],
    }

def create_decision_boundary(X_transformed, model, scaler, pretrained_tree, class_names, method, step):
    """Create decision boundary based on the dimensionality reduction method."""
    if method.lower() == 'pca':
        return generate_pca_decision_boundary(X_transformed, model, scaler, pretrained_tree, class_names, step)
    else:
        return generate_basic_decision_boundary(X_transformed)

# ---------------- Feature Mapping ---------------- #

def map_encoded_to_original_data(encoded_data, encoded_feature_names, original_feature_names):
    """
    Map encoded data back to original feature names for frontend display.
    
    Parameters:
    -----------
    encoded_data : array-like
        Encoded feature data
    encoded_feature_names : list
        List of encoded feature names
    original_feature_names : list
        List of original feature names
        
    Returns:
    --------
    list
        List of dictionaries with original feature names as keys
    """
    original_series_list = []
    
    for row in encoded_data:
        mapped_row = {}
        
        # Create basic mapping between encoded and original features
        for i, encoded_name in enumerate(encoded_feature_names):
            if i < len(original_feature_names):
                original_name = original_feature_names[min(i, len(original_feature_names) - 1)]
                mapped_row[original_name] = row[i]
            else:
                # For one-hot encoded features, you might want different logic here
                mapped_row[encoded_name] = row[i]
        
        # Fill in any missing original features with appropriate defaults
        for orig_name in original_feature_names:
            if orig_name not in mapped_row:
                mapped_row[orig_name] = 0.0
                
        original_series_list.append(mapped_row)
    
    return original_series_list

# ---------------- Data Preparation ---------------- #

def combine_original_and_neighborhood_data(X, y, X_original, y_original):
    """Combine original dataset with neighborhood data."""
    originalPointsNeighPointsBoolArray = [True] * len(X_original) + [False] * len(X)
    X_combined = np.vstack((X_original, X))
    y_combined = np.concatenate((y_original, y))
    return X_combined, y_combined, originalPointsNeighPointsBoolArray

def prepare_visualization_data_arrays(X, y, X_original=None, y_original=None):
    """Prepare data arrays for visualization, optionally combining with original data."""
    if X_original is not None and y_original is not None:
        return combine_original_and_neighborhood_data(X, y, X_original, y_original)
    else:
        originalPointsNeighPointsBoolArray = [False] * len(X)
        return X, y, originalPointsNeighPointsBoolArray

def create_feature_value_dictionary(row, feature_names):
    """Create a dictionary mapping feature names to values for a single row."""
    data_dict = {}
    for j, feature_name in enumerate(feature_names):
        if j < len(row):
            value = row[j]
            # Handle different data types properly
            if isinstance(value, (np.integer, np.floating)):
                data_dict[feature_name] = float(value)
            elif isinstance(value, np.ndarray):
                data_dict[feature_name] = float(value.item()) if value.size == 1 else float(value[0])
            else:
                data_dict[feature_name] = value
        else:
            data_dict[feature_name] = 0.0
    return data_dict

def convert_arrays_to_feature_dictionaries(filtered_encoded_data, feature_names):
    """Convert filtered encoded data arrays to dictionaries with feature names."""
    if feature_names is None:
        return filtered_encoded_data.tolist()
        
    # Handle DataFrame vs array input
    if hasattr(filtered_encoded_data, 'values'):
        data_array = filtered_encoded_data.values
    else:
        data_array = filtered_encoded_data
        
    original_data_dicts = []
    for row in data_array:
        data_dict = create_feature_value_dictionary(row, feature_names)
        original_data_dicts.append(data_dict)
    
    return original_data_dicts

def estimate_original_points_boolean_array(filtered_labels, original_count):
    """Estimate which filtered points came from original data vs neighborhood."""
    original_bool_array_filtered = []
    
    for i in range(len(filtered_labels)):
        # Estimate if this filtered point came from original data or neighborhood
        if i < min(original_count, len(filtered_labels)):
            original_bool_array_filtered.append(True)
        else:
            original_bool_array_filtered.append(False)
    
    return original_bool_array_filtered

def update_original_points_array_for_filtering(originalPointsNeighPointsBoolArray, filtered_labels, X_original):
    """Update the original points boolean array to account for data filtering."""
    if X_original is not None:
        original_count = len(X_original)
        return estimate_original_points_boolean_array(filtered_labels, original_count)
    else:
        return [False] * len(filtered_labels)

# ---------------- Main Visualization Functions ---------------- #

def create_scatter_plot_data(encoded_feature_names, original_feature_names, X, y, pretrained_tree, class_names, X_original=None, y_original=None, method='umap', step=0.1, random_state=42):
    """
    Generate visualization data and decision boundaries for a pre-trained decision tree
    using either PCA or t-SNE dimensionality reduction.
    
    Parameters:
    -----------
    encoded_feature_names : list
        List of encoded feature names (used for internal processing)
    original_feature_names : list
        List of original feature names (used for output mapping)
    X : array-like
        Input features (encoded)
    y : array-like
        Target labels
    pretrained_tree : DecisionTreeClassifier
        Pre-trained decision tree classifier on encoded data
    class_names : list
        List of class names
    X_original : array-like, optional
        Original dataset features (encoded)
    y_original : array-like, optional
        Original dataset labels
    method : str, default='umap'
        Dimensionality reduction method ('pca', 'tsne', 'umap', or 'mds')
    step : float, default=0.1
        Step size for decision boundary grid
    random_state : int, default=42
        Random state for reproducibility
        
    Returns:
    --------
    dict
        Visualization data including transformed coordinates, mapped original data, and decision boundaries
    """
    # Prepare data arrays
    X_combined, y_combined, originalPointsNeighPointsBoolArray = prepare_visualization_data_arrays(X, y, X_original, y_original)
     
    # Transform data using encoded features
    X_transformed, model, scaler = preprocess_data(X_combined, method=method, random_state=random_state)
    
    # Filter transformed points and original data
    filtered_transformed_data, filtered_encoded_data, filtered_labels = filter_points_by_class_kmeans(
        X_transformed, X_combined, y_combined, threshold=2000, threshold_multiplier=5, random_state=random_state
    )
    
    # Create decision boundary
    decision_boundary = create_decision_boundary(X_transformed, model, scaler, pretrained_tree, class_names, method, step)
    
    # Map encoded data back to original feature names for frontend display
    original_series_list = map_encoded_to_original_data(
        filtered_encoded_data, 
        encoded_feature_names, 
        original_feature_names
    )
    
    # Prepare visualization data
    visualization_data = {
        "transformedData": filtered_transformed_data.tolist(),
        "originalData": original_series_list,  # Now mapped to original feature names
        "targets": filtered_labels.tolist(),
        "decisionBoundary": decision_boundary,
        "method": method,
        "originalPointsNeighPointsBoolArray": originalPointsNeighPointsBoolArray,
    }
    
    return visualization_data

def create_scatter_plot_data_raw(X, y, pretrained_tree, class_names, feature_names=None, X_original=None, y_original=None, method='umap', step=0.1, random_state=42):
    """
    Generate visualization data without backend feature mapping.
    Frontend will handle decoding using dataset descriptor.
    """
    # Prepare data arrays  
    X_combined, y_combined, originalPointsNeighPointsBoolArray = prepare_visualization_data_arrays(X, y, X_original, y_original)
     
    # Transform data
    X_transformed, model, scaler = preprocess_data(X_combined, method=method, random_state=random_state)
    
    # Filter data
    filtered_transformed_data, filtered_encoded_data, filtered_labels = filter_points_by_class_kmeans(
        X_transformed, X_combined, y_combined, threshold=2000, threshold_multiplier=5, random_state=random_state
    )
    
    # Create decision boundary
    decision_boundary = create_decision_boundary(X_transformed, model, scaler, pretrained_tree, class_names, method, step)
    
    # Convert arrays to dictionaries with feature names as keys
    original_data_output = convert_arrays_to_feature_dictionaries(filtered_encoded_data, feature_names)
    
    # Update boolean array to match filtered data
    originalPointsNeighPointsBoolArray = update_original_points_array_for_filtering(
        originalPointsNeighPointsBoolArray, filtered_labels, X_original
    )
    
    # Return data with dictionaries instead of arrays
    visualization_data = {
        "transformedData": filtered_transformed_data.tolist(),
        "originalData": original_data_output,  # Now dictionaries with feature names
        "targets": filtered_labels.tolist(),
        "decisionBoundary": decision_boundary,
        "method": method,
        "originalPointsNeighPointsBoolArray": originalPointsNeighPointsBoolArray,
    }
    
    return visualization_data
