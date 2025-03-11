# routes/dataset.py
from fastapi import APIRouter

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import MinMaxScaler
from matplotlib.colors import rgb2hex

from pythonHelpers.routes.state import global_state

router = APIRouter(prefix="/api")

def compute_centroids(X, y):
    """
    Compute centroids for each class in the dataset.
    
    Parameters:
    - X: feature matrix
    - y: target values
    
    Returns:
    - Dictionary mapping class labels to centroids
    """
    unique_classes = np.unique(y)
    centroids = {}
    
    for cls in unique_classes:
        class_samples = X[y == cls]
        centroids[cls] = np.mean(class_samples, axis=0)
    
    return centroids

def project_to_rgb(centroids):
    """
    Project centroids to RGB color space.
    
    Parameters:
    - centroids: Dictionary mapping class labels to centroids
    
    Returns:
    - Dictionary mapping class labels to RGB colors
    """
    labels = list(centroids.keys())
    centroid_matrix = np.array([centroids[label] for label in labels])
    
    # Use PCA to reduce to 3 dimensions
    if centroid_matrix.shape[1] > 3:
        pca = PCA(n_components=3)
        reduced_centroids = pca.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
    
    # Scale to [0, 1] range for RGB
    scaler = MinMaxScaler(feature_range=(0, 1))
    rgb_values = scaler.fit_transform(reduced_centroids)
    
    # Create dictionary mapping labels to RGB colors
    colors = {label: rgb_values[i] for i, label in enumerate(labels)}
    return colors

@router.get("/get-classes-colors")
async def get_colors():
    # Check if we have target names and they're long enough to warrant computing colors
    if global_state.target_names and len(global_state.target_names) < 10:
        # Get the dataset from the current state
        if global_state.neighb_train_X is not None and global_state.neighb_train_y is not None:
            # Compute centroids using the neighborhood data
            centroids = compute_centroids(
                global_state.neighb_train_X,
                global_state.neighb_train_y
            )
        else:
            # Return default colors if no data is available
            return default_colors()
            
        # Project centroids to RGB space
        colors = project_to_rgb(centroids)
        
        # Convert to hex
        return [rgb2hex(color) for color in colors.values()]
    
    return default_colors()

def default_colors():
    """Return a default set of colors"""
    return [
        "#8dd3c7",
        "#ffffb3",
        "#bebada",
        "#fb8072",
        "#80b1d3",
        "#fdb462",
        "#b3de69",
        "#fccde5",
        "#d9d9d9",
        "#bc80bd",
    ]