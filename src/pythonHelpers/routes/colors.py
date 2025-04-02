from fastapi import APIRouter
from fastapi.responses import JSONResponse

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import MinMaxScaler
from matplotlib.colors import rgb2hex
from sklearn.manifold import TSNE, MDS
import logging
logging.getLogger('numba').setLevel(logging.WARNING)
import umap

from pythonHelpers.routes.state import global_state

DEFAULT_COLORS = [
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

def project_to_rgb(centroids, method, random_state=42):
    """
    Project centroids to RGB color space using specified dimensionality reduction method.
    
    Parameters:
    - centroids: Dictionary mapping class labels to centroids
    - method: Dimensionality reduction method to use ('pca', 'umap', 'tsne', or 'mds')
    
    Returns:
    - Dictionary mapping class labels to RGB colors
    """
    labels = list(centroids.keys())
    centroid_matrix = np.array([centroids[label] for label in labels])
    
    # Use the specified method to reduce to 3 dimensions if necessary
    if centroid_matrix.shape[1] > 3:
        method = method.lower()

        if method == "pca":
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        elif method == "tsne":
            # For t-SNE, perplexity should be smaller than n_samples - 1
            tsne_params = {
                'perplexity': min(5, len(centroid_matrix)-1),
                'early_exaggeration': 12.0,
                'learning_rate': 'auto',
                'n_iter': 1000,
                'n_iter_without_progress': 300
            }
            reducer = TSNE(n_components=2, random_state=random_state, **tsne_params)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        elif method == "umap":
            # Set min_dist to a small value for better spread in the embedding
            # Set n_neighbors small for this small dataset
            reducer = umap.UMAP(n_components=3, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        elif method == "mds":
            reducer = MDS(n_components=3, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        else:
            # Default to PCA if an invalid method is specified
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
    
    # Scale to [0, 1] range for RGB
    scaler = MinMaxScaler(feature_range=(0, 1))
    rgb_values = scaler.fit_transform(reduced_centroids)
    
    # Extra safety: clip values to ensure they're in [0, 1]
    rgb_values = np.clip(rgb_values, 0, 1)
    
    # Create dictionary mapping labels to RGB colors
    colors = {label: rgb_values[i] for i, label in enumerate(labels)}
    return colors

@router.get("/get-classes-colors")
async def get_colors(method):
    if len(global_state.target_names) > 10:
        # Compute centroids using the neighborhood data
        centroids = compute_centroids(
            global_state.neighb_train_X,
            global_state.neighb_train_y
        )
            
        # Project centroids to RGB space using the specified method
        colors = project_to_rgb(centroids, method)
            
        # Convert to hex
        return [rgb2hex(color) for color in colors.values()]

    return DEFAULT_COLORS
