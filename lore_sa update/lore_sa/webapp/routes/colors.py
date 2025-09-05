from fastapi import APIRouter

import numpy as np
# from matplotlib.colors import rgb2hex
from skimage import color
import logging
logging.getLogger('numba').setLevel(logging.WARNING)
import umap

from .state import webapp_state

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
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        elif method == "tsne":
            # For t-SNE, perplexity should be smaller than n_samples - 1
            from sklearn.manifold import TSNE
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
            from sklearn.manifold import MDS
            reducer = MDS(n_components=3, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        else:
            # Default to PCA if an invalid method is specified
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
    
    # Scale to [0, 1] range for RGB
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    rgb_values = scaler.fit_transform(reduced_centroids)
    
    # Extra safety: clip values to ensure they're in [0, 1]
    rgb_values = np.clip(rgb_values, 0, 1)
    
    # Create dictionary mapping labels to RGB colors
    colors = {label: rgb_values[i] for i, label in enumerate(labels)}
    return colors

def cielab_hex_from_xy(x, y, L=70):
    """
    Map x, y (0 to 1) to a*, b* (scaled to typical Lab range)
    and return hex color code.
    """
    a = ((x-0.5)*2) * 128  
    b = ((y-0.5)*2) * 128
    lab = np.array([L, a, b])[None, None, :]
    rgb = color.lab2rgb(lab)[0,0,:]
    rgb = np.clip(rgb, 0, 1)
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))

def project_to_cielab(centroids, method, random_state=42):
    """
    Project centroids to 2D and then map to CIELAB color space.
    
    Parameters:
    - centroids: Dictionary mapping class labels to centroids
    - method: Dimensionality reduction method to use ('pca', 'umap', 'tsne', or 'mds')
    
    Returns:
    - List of hex color codes
    """
    labels = list(centroids.keys())
    centroid_matrix = np.array([centroids[label] for label in labels])
    
    # Use the specified method to reduce to 2 dimensions if necessary
    if centroid_matrix.shape[1] > 2:
        method = method.lower()

        if method == "pca":
            reducer = PCA(n_components=2)
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
            # Set n_neighbors small for this small dataset
            reducer = umap.UMAP(
                        n_components=2, 
                        random_state=random_state,
                        init='random',  # Use random initialization instead of spectral
                        min_dist=0.1
                    )
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        elif method == "mds":
            from sklearn.manifold import MDS
            reducer = MDS(n_components=2, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        
        else:
            from sklearn.decomposition import PCA
            # Default to PCA if an invalid method is specified
            reducer = PCA(n_components=2)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
        
    # Scale to [0, 1] range for color mapping
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    xy_values = scaler.fit_transform(reduced_centroids)
    
    # Extra safety: clip values to ensure they're in [0, 1]
    xy_values = np.clip(xy_values, 0, 1)
    
    # Convert 2D coordinates to CIELAB hex colors
    hex_colors = []
    for i, (x, y) in enumerate(xy_values):
        hex_color = cielab_hex_from_xy(x, y)
        hex_colors.append(hex_color)
    
    return hex_colors

@router.get("/get-classes-colors")
async def get_colors(method):
    if len(webapp_state.target_names) > 10:
        # Compute centroids using the neighborhood data
        centroids = compute_centroids(
            webapp_state.neighb_train_X,
            webapp_state.neighb_train_y
        )
            
        # Project centroids to 2D and map to CIELAB colors
        colors = project_to_cielab(centroids, method)
            
        return colors

    return DEFAULT_COLORS