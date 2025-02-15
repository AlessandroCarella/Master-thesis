import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import json
from scipy.spatial import Voronoi
from shapely.geometry import Polygon
from shapely.ops import unary_union
import networkx as nx
from sklearn.cluster import KMeans

def preprocess_data(X):
    """
    Standardize the data and apply PCA transformation.
    
    Parameters:
    -----------
    X : array-like
        Input features
        
    Returns:
    --------
    tuple
        (transformed_data, pca_model, scaler_model)
    """
    scaler = StandardScaler()
    pca = PCA(n_components=2)
    X_scaled = scaler.fit_transform(X)
    X_pca = pca.fit_transform(X_scaled)
    return X_pca, pca, scaler

def generate_decision_boundary_grid(X_pca, step=0.1):
    """
    Generate a grid for decision boundary visualization.
    
    Parameters:
    -----------
    X_pca : array-like
        PCA transformed features
    step : float, default=0.1
        Step size for the grid
        
    Returns:
    --------
    tuple
        (xx, yy) meshgrid arrays and (x_min, x_max, y_min, y_max) boundaries
    """
    x_min, x_max = X_pca[:, 0].min() - 1, X_pca[:, 0].max() + 1
    y_min, y_max = X_pca[:, 1].min() - 1, X_pca[:, 1].max() + 1
    xx, yy = np.meshgrid(
        np.arange(x_min, x_max, step),
        np.arange(y_min, y_max, step)
    )
    return xx, yy, (x_min, x_max, y_min, y_max)

def filter_points_by_class_kmeans(points, labels, threshold=500, threshold_multiplier=4, random_state=42):
    """
    Filter points using K-means clustering to reduce data density.
    
    Parameters:
    -----------
    points : array-like
        Input points to filter
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
        (filtered_points, filtered_labels)
    """
    filtered_points = []
    filtered_labels = []
    unique_classes = np.unique(labels)

    for cls in unique_classes:
        class_indices = np.where(labels == cls)[0]
        class_points = points[class_indices]
        n_points = len(class_points)

        if n_points > threshold:
            sample_size = min(threshold * threshold_multiplier, n_points)
            rng = np.random.RandomState(random_state)
            sampled_indices = rng.choice(n_points, size=sample_size, replace=False)
            sampled_points = class_points[sampled_indices]

            kmeans = KMeans(n_clusters=threshold, random_state=random_state, n_init=10)
            kmeans.fit(sampled_points)
            centroids = kmeans.cluster_centers_

            selected_points = []
            for centroid in centroids:
                distances = np.linalg.norm(class_points - centroid, axis=1)
                closest_index = np.argmin(distances)
                selected_points.append(class_points[closest_index])

            selected_points = np.array(selected_points)
        else:
            selected_points = class_points

        filtered_points.append(selected_points)
        filtered_labels.extend([cls] * len(selected_points))

    return np.vstack(filtered_points), np.array(filtered_labels)

def create_voronoi_regions(xx, yy, Z):
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
        
    Returns:
    --------
    tuple
        (merged_regions, merged_classes)
    """
    G = nx.Graph()
    vor = Voronoi(np.c_[xx.ravel(), yy.ravel()])
    regions, vertices = vor.regions, vor.vertices

    region_class_map = {}
    region_polygons = []
    region_class_list = []
    region_index_map = {}

    polygon_idx = 0
    for point_index, region_index in enumerate(vor.point_region):
        region = regions[region_index]
        if not -1 in region and len(region) > 0:
            polygon = Polygon([vertices[i] for i in region])
            region_polygons.append(polygon)
            region_class_map[region_index] = Z.ravel()[point_index]
            region_class_list.append(Z.ravel()[point_index])
            region_index_map[region_index] = polygon_idx
            G.add_node(region_index)
            polygon_idx += 1

    # Find adjacent regions
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

def generate_pca_visualization_data(data_file, feature_names, target_names, X, y, pretrained_tree, step=0.1):
    """
    Generate PCA visualization data and decision boundaries for a pre-trained decision tree.
    
    Parameters:
    -----------
    data_file : str
        Path to output JSON file
    feature_names : list
        List of feature names
    target_names : list
        List of target class names
    X : array-like
        Input features
    y : array-like
        Target labels
    pretrained_tree : DecisionTreeClassifier
        Pre-trained decision tree classifier on original (non-PCA) data
    step : float, default=0.1
        Step size for decision boundary grid
    """
    # Transform data
    X_pca, pca, scaler = preprocess_data(X)
    
    # Generate grid in PCA space
    xx, yy, (x_min, x_max, y_min, y_max) = generate_decision_boundary_grid(X_pca, step)
    
    # Transform grid points back to original space for prediction
    grid_points = np.c_[xx.ravel(), yy.ravel()]
    grid_original = pca.inverse_transform(grid_points)
    grid_original = scaler.inverse_transform(grid_original)
    
    # Get predictions using the pre-trained tree
    Z = pretrained_tree.predict(grid_original).reshape(xx.shape)
    
    # Filter PCA points
    filtered_pca_data, filtered_labels = filter_points_by_class_kmeans(
        X_pca, y, threshold=2000, threshold_multiplier=5
    )
    
    # Create Voronoi regions
    merged_regions, merged_classes = create_voronoi_regions(xx, yy, Z)
    
    # Format PC labels
    pc1_label = format_pc_label(pca.components_[0], feature_names, 0)
    pc2_label = format_pc_label(pca.components_[1], feature_names, 1)
    
    # Prepare visualization data
    visualization_data = {
        "pcaData": filtered_pca_data.tolist(),
        "targets": filtered_labels.tolist(),
        "targetNames": list(target_names),
        "decisionBoundary": {
            "regions": [list(p.exterior.coords) for p in merged_regions],
            "regionClasses": [int(c) for c in merged_classes],
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
        },
        "xAxisLabel": pc1_label,
        "yAxisLabel": pc2_label,
    }
    
    # Save to file
    with open(data_file, "w") as f:
        json.dump(visualization_data, f, indent=4)