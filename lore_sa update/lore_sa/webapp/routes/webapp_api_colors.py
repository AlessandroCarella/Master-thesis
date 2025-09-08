from typing import Dict, List, Tuple
import numpy as np
import logging
logging.getLogger('numba').setLevel(logging.WARNING)
from fastapi import APIRouter
from skimage import color
import umap

from .webapp_api_state import webapp_state
from .webapp_api_utils import safe_json_response


DEFAULT_COLORS = [
    "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3",
    "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd",
]

router = APIRouter(prefix="/api")


def compute_centroids(X: np.ndarray, y: np.ndarray) -> Dict[int, np.ndarray]:
    """
    Calculate class centroids from feature data and labels.
    
    Parameters
    ----------
    X : np.ndarray
        Feature matrix with shape (n_samples, n_features).
    y : np.ndarray
        Class labels with shape (n_samples,).
        
    Returns
    -------
    Dict[int, np.ndarray]
        Mapping from class labels to centroid coordinates.
    """
    unique_classes = np.unique(y)
    centroids = {}
    
    for cls in unique_classes:
        class_samples = X[y == cls]
        centroids[cls] = np.mean(class_samples, axis=0)
    
    return centroids


def project_to_rgb(centroids: Dict[int, np.ndarray], method: str, 
                  random_state: int = 42) -> Dict[int, np.ndarray]:
    """
    Project high-dimensional centroids to RGB color space.
    
    Parameters
    ----------
    centroids : Dict[int, np.ndarray]
        Class centroids in original feature space.
    method : str
        Dimensionality reduction method ('pca', 'tsne', 'umap', 'mds').
    random_state : int, default=42
        Random seed for reproducible results.
        
    Returns
    -------
    Dict[int, np.ndarray]
        Mapping from class labels to RGB color values [0, 1].
        
    Notes
    -----
    Reduces centroids to 3D space then maps to RGB color channels.
    Uses MinMaxScaler to ensure valid RGB ranges.
    """
    labels = list(centroids.keys())
    centroid_matrix = np.array([centroids[label] for label in labels])
    
    if centroid_matrix.shape[1] > 3:
        method = method.lower()

        if method == "pca":
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        elif method == "tsne":
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
            reducer = umap.UMAP(n_components=3, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        elif method == "mds":
            from sklearn.manifold import MDS
            reducer = MDS(n_components=3, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        else:
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=3)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
    
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    rgb_values = scaler.fit_transform(reduced_centroids)
    rgb_values = np.clip(rgb_values, 0, 1)
    
    colors = {label: rgb_values[i] for i, label in enumerate(labels)}
    return colors


def cielab_hex_from_xy(x: float, y: float, L: int = 70) -> str:
    """
    Convert 2D coordinates to hex color using CIELAB color space.
    
    Parameters
    ----------
    x : float
        X coordinate in [0, 1] range.
    y : float  
        Y coordinate in [0, 1] range.
    L : int, default=70
        Lightness value for CIELAB conversion.
        
    Returns
    -------
    str
        Hex color string in format "#RRGGBB".
        
    Notes
    -----
    Maps 2D coordinates to perceptually uniform CIELAB color space,
    then converts to RGB hex representation.
    """
    a = ((x-0.5)*2) * 128  
    b = ((y-0.5)*2) * 128
    lab = np.array([L, a, b])[None, None, :]
    rgb = color.lab2rgb(lab)[0,0,:]
    rgb = np.clip(rgb, 0, 1)
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))


def project_to_cielab(centroids: Dict[int, np.ndarray], method: str, 
                     random_state: int = 42) -> List[str]:
    """
    Project centroids to 2D space and generate CIELAB-based hex colors.
    
    Parameters
    ----------
    centroids : Dict[int, np.ndarray]
        Class centroids in original feature space.
    method : str
        Dimensionality reduction method ('pca', 'tsne', 'umap', 'mds').
    random_state : int, default=42
        Random seed for reproducible results.
        
    Returns
    -------
    List[str]
        List of hex color strings for each class.
        
    Notes
    -----
    Designed for datasets with many classes (>10) to generate
    perceptually distinct colors using CIELAB color space.
    """
    labels = list(centroids.keys())
    centroid_matrix = np.array([centroids[label] for label in labels])
    
    if centroid_matrix.shape[1] > 2:
        method = method.lower()

        if method == "pca":
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=2)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        elif method == "tsne":
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
            reducer = umap.UMAP(
                        n_components=2, 
                        random_state=random_state,
                        init='random',
                        min_dist=0.1
                    )
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        elif method == "mds":
            from sklearn.manifold import MDS
            reducer = MDS(n_components=2, random_state=random_state)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
        else:
            from sklearn.decomposition import PCA
            reducer = PCA(n_components=2)
            reduced_centroids = reducer.fit_transform(centroid_matrix)
    else:
        reduced_centroids = centroid_matrix
        
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    xy_values = scaler.fit_transform(reduced_centroids)
    xy_values = np.clip(xy_values, 0, 1)
    
    hex_colors = []
    for x, y in xy_values:
        hex_color = cielab_hex_from_xy(x, y)
        hex_colors.append(hex_color)
    
    return hex_colors


@router.get("/get-classes-colors")
async def get_colors(method: str) -> List[str]:
    """
    Generate colors for class visualization based on data distribution.
    
    Parameters
    ---------- 
    method : str
        Dimensionality reduction method for color generation.
        
    Returns
    -------
    List[str]
        List of hex color strings for class visualization.
        
    Notes
    -----
    For datasets with >10 classes, generates colors using centroid projection
    to CIELAB color space. Otherwise returns predefined color palette.
    """
    if len(webapp_state.target_names) > 10:
        centroids = compute_centroids(
            webapp_state.decoded_neighborhood,
            webapp_state.neighb_predictions
        )
        colors = project_to_cielab(centroids, method)
        return colors

    return safe_json_response(DEFAULT_COLORS)
