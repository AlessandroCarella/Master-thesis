from typing import Dict, Any, Union
import numpy as np
import logging
import umap

# Configure logging for numba (used by UMAP)
logging.getLogger('numba').setLevel(logging.WARNING)


def create_dimensionality_reducer(method: str, n_components: int, parameters: Dict[str, Any] = None, 
                                 random_state: int = 42, X_scaled: np.ndarray = None):
    """
    Create a dimensionality reducer with specified method and parameters.
    
    Parameters
    ----------
    method : str
        Reduction method ('pca', 'tsne', 'umap', 'mds').
    n_components : int
        Number of output dimensions (2 or 3).
    parameters : Dict[str, Any], default=None
        Method-specific parameters.
    random_state : int, default=42
        Random seed for reproducible results.
    X_scaled : np.ndarray, default=None
        Scaled input data (required for t-SNE parameter validation).
        
    Returns
    -------
    Any
        Configured dimensionality reducer.
        
    Raises
    ------
    ValueError
        If unsupported reduction method is specified.
    """
    if parameters is None:
        parameters = {}
        
    method = method.lower()
    
    if method == "pca":
        return _create_pca_reducer(n_components, parameters, random_state)
    elif method == "tsne":
        return _create_tsne_reducer(n_components, parameters, random_state, X_scaled)
    elif method == "umap":
        return _create_umap_reducer(n_components, parameters, random_state)
    elif method == "mds":
        return _create_mds_reducer(n_components, parameters, random_state)
    else:
        # Default to PCA if method not recognized
        from sklearn.decomposition import PCA
        return PCA(n_components=n_components, random_state=random_state)


def _create_pca_reducer(n_components: int, parameters: Dict[str, Any], random_state: int):
    """Create PCA reducer with specified parameters."""
    from sklearn.decomposition import PCA
    
    params = {
        'n_components': n_components,
        'random_state': random_state
    }
    
    # Update with user parameters
    if 'whiten' in parameters:
        params['whiten'] = parameters['whiten']
    if 'svd_solver' in parameters:
        params['svd_solver'] = parameters['svd_solver']
    if 'tol' in parameters and parameters.get('svd_solver') == 'arpack':
        params['tol'] = parameters['tol']
    if 'iterated_power' in parameters and parameters.get('svd_solver') == 'randomized':
        params['iterated_power'] = int(parameters['iterated_power'])
        
    return PCA(**params)


def _create_tsne_reducer(n_components: int, parameters: Dict[str, Any], random_state: int, 
                        X_scaled: np.ndarray = None):
    """Create t-SNE reducer with specified parameters."""
    from sklearn.manifold import TSNE
    
    params = {
        'n_components': n_components,
        'random_state': random_state,
        'n_jobs': 1  # Avoid parallel processing issues
    }
    
    # Update with user parameters
    if 'perplexity' in parameters:
        if X_scaled is not None:
            # Ensure perplexity is valid for dataset size
            max_perplexity = min(parameters['perplexity'], (X_scaled.shape[0] - 1) / 3)
            params['perplexity'] = max(5.0, max_perplexity)
        else:
            # Use provided perplexity or safe default for centroids
            params['perplexity'] = max(5.0, parameters['perplexity'])
    else:
        if X_scaled is not None:
            params['perplexity'] = min(30.0, X_scaled.shape[0] / 3)
        else:
            # Use safe default for centroids (typically small number of points)
            params['perplexity'] = 5.0
            
    if 'early_exaggeration' in parameters:
        params['early_exaggeration'] = parameters['early_exaggeration']
    if 'learning_rate' in parameters:
        if parameters['learning_rate'] == 'auto':
            params['learning_rate'] = 'auto'
        else:
            params['learning_rate'] = float(parameters['learning_rate'])
    if 'max_iter' in parameters:
        params['max_iter'] = int(parameters['max_iter'])
    if 'metric' in parameters:
        params['metric'] = parameters['metric']
    if 'init' in parameters:
        params['init'] = parameters['init']
    if 'method' in parameters:
        params['method'] = parameters['method']
        
    return TSNE(**params)


def _create_umap_reducer(n_components: int, parameters: Dict[str, Any], random_state: int):
    """Create UMAP reducer with specified parameters."""
    params = {
        'n_components': n_components,
        'random_state': random_state
    }
    
    # Update with user parameters
    if 'n_neighbors' in parameters:
        params['n_neighbors'] = int(parameters['n_neighbors'])
    if 'min_dist' in parameters:
        params['min_dist'] = parameters['min_dist']
    if 'spread' in parameters:
        params['spread'] = parameters['spread']
    if 'n_epochs' in parameters:
        params['n_epochs'] = int(parameters['n_epochs'])
    if 'learning_rate' in parameters:
        params['learning_rate'] = parameters['learning_rate']
    if 'metric' in parameters:
        params['metric'] = parameters['metric']
        
    return umap.UMAP(**params)


def _create_mds_reducer(n_components: int, parameters: Dict[str, Any], random_state: int):
    """Create MDS reducer with specified parameters."""
    from sklearn.manifold import MDS
    
    params = {
        'n_components': n_components,
        'random_state': random_state
    }
    
    # Update with user parameters
    if 'metric' in parameters:
        params['metric'] = parameters['metric']
    if 'n_init' in parameters:
        params['n_init'] = int(parameters['n_init'])
    if 'max_iter' in parameters:
        params['max_iter'] = int(parameters['max_iter'])
    if 'eps' in parameters:
        params['eps'] = parameters['eps']
    if 'dissimilarity' in parameters:
        params['dissimilarity'] = parameters['dissimilarity']
        
    return MDS(**params)


def can_generate_boundary(method: str) -> bool:
    """
    Check if method supports decision boundary generation.
    
    Parameters
    ----------
    method : str
        Dimensionality reduction method.
        
    Returns
    -------
    bool
        True if method supports inverse transformation for boundaries.
        
    Notes
    -----
    Only PCA currently supports decision boundary generation due to
    its linear and invertible nature.
    """
    return method.lower() == 'pca'
