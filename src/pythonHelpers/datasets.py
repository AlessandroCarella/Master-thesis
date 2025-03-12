from sklearn.datasets import (
    load_iris, 
    load_wine, 
    load_breast_cancer, 
    load_diabetes, 
    fetch_california_housing
)
import numpy as np
import os
import joblib
import logging

# Available datasets with kind information
DATASETS = {
    'iris': 'tabular',
    'wine': 'tabular',
    'breast_cancer': 'tabular',
    'diabetes': 'tabular',
    'california_housing_3': 'tabular',
    'california_housing_11': 'tabular',
}

def get_available_datasets():
    """Return list of available datasets"""
    return DATASETS

# Dataset-specific information functions
def get_dataset_information_iris():
    """Get detailed information about the iris dataset"""
    dataset = load_iris()
    return {
        "name": "iris",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": list(dataset.target_names),
    }

def get_dataset_information_wine():
    """Get detailed information about the wine dataset"""
    dataset = load_wine()
    return {
        "name": "wine",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": list(dataset.target_names),
    }

def get_dataset_information_breast_cancer():
    """Get detailed information about the breast cancer dataset"""
    dataset = load_breast_cancer()
    target_names = list(dataset.target_names)
    target_names[0], target_names[1] = target_names[1], target_names[0]
    return {
        "name": "breast_cancer",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }

def get_dataset_information_diabetes():
    """Get detailed information about the diabetes dataset"""
    dataset = load_diabetes()
    # Diabetes dataset doesn't have target names, so we create them
    target_names = ['diabetic', 'non-diabetic']
    return {
        "name": "diabetes",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }

def get_dataset_information_california_housing_3():
    """Get detailed information about the California housing dataset"""
    dataset = fetch_california_housing()
    # California housing is now a 3-class classification dataset
    target_names = ['high_price', 'low_price', 'medium_price']
    return {
        "name": "california_housing_3",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }

def get_dataset_information_california_housing_11():
    """Get detailed information about the California housing dataset with 11 classes."""
    dataset = fetch_california_housing()
    target_names = [f'percentile_{i}' for i in range(11)]
    return {
        "name": "california_housing_11",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }

def load_cached_dataset_information(dataset_name, info_function, cache_dir='cache'):
    """Load dataset information from cache if available, else compute and cache it"""
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f'{dataset_name}_info.pkl')
    
    if os.path.exists(cache_file):
        info = joblib.load(cache_file)
        logging.info(f"Loaded {dataset_name} information from cache.")
    else:
        info = info_function()
        joblib.dump(info, cache_file)
        logging.info(f"Cached {dataset_name} information to file.")
    
    return info

# Dataset-specific loading functions
def load_dataset_iris():
    """Load and preprocess the iris dataset"""
    dataset = load_iris()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names

def load_dataset_wine():
    """Load and preprocess the wine dataset"""
    dataset = load_wine()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names

def load_dataset_breast_cancer():
    """Load and preprocess the breast cancer dataset"""
    dataset = load_breast_cancer()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names

def load_dataset_diabetes():
    """Load and preprocess the diabetes dataset"""
    dataset = load_diabetes()
    feature_names = list(dataset.feature_names)
    # Create binary classification target names
    target_names = ['non-diabetic', 'diabetic']
    # Convert continuous target to binary classification
    dataset.target = (dataset.target > dataset.target.mean()).astype(int)
    return dataset, feature_names, target_names

def load_dataset_california_housing_3():
    """Load and preprocess the California housing dataset"""
    dataset = fetch_california_housing()
    feature_names = list(dataset.feature_names)
    target_names = ['medium_price', 'low_price', 'high_price']
    
    # Convert continuous target to 3-class classification based on percentiles
    prices = dataset.target
    low_threshold = np.percentile(prices, 33.33)
    high_threshold = np.percentile(prices, 66.66)
    
    # Create 3-class labels: 0 for low, 1 for medium, 2 for high
    dataset.target = np.zeros_like(prices, dtype=int)
    dataset.target[(prices > low_threshold) & (prices <= high_threshold)] = 1
    dataset.target[prices > high_threshold] = 2
    
    return dataset, feature_names, target_names

def load_dataset_california_housing_11():
    """Load and preprocess the California housing dataset into 11 classes."""
    dataset = fetch_california_housing()
    feature_names = list(dataset.feature_names)
    target_names = [f'percentile_{i}' for i in range(11)]
    
    # Define percentile-based bins
    prices = dataset.target
    percentiles = np.percentile(prices, np.linspace(0, 100, 12))
    
    # Assign labels based on the bin each price falls into
    dataset.target = np.digitize(prices, percentiles, right=True) - 1
    
    return dataset, feature_names, target_names

# Cache loading for datasets (for actual data)
def load_cached_dataset(dataset_name, load_function, cache_dir='cache'):
    """Load dataset from cache if available, else compute and cache it"""
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f'{dataset_name}.pkl')
    
    if os.path.exists(cache_file):
        dataset = joblib.load(cache_file)
        logging.info(f"Loaded {dataset_name} from cache.")
    else:
        dataset = load_function()
        joblib.dump(dataset, cache_file)
        logging.info(f"Cached {dataset_name} to file.")
    
    return dataset

# Main interface functions
def get_dataset_information(dataset_name: str, cache_dir='cache'):
    """Get detailed information about a specific dataset with caching support"""
    # Map of dataset names to their specific information functions
    information_functions = {
        'iris': get_dataset_information_iris,
        'wine': get_dataset_information_wine,
        'breast_cancer': get_dataset_information_breast_cancer,
        'diabetes': get_dataset_information_diabetes,
        'california_housing_3': get_dataset_information_california_housing_3,
        'california_housing_11': get_dataset_information_california_housing_11,
    }
    
    return load_cached_dataset_information(dataset_name, information_functions[dataset_name], cache_dir=cache_dir)
        
def load_dataset(dataset_name: str):
    """Load a dataset and return features, target, and metadata"""    
    # Map of dataset names to their specific loading functions
    loading_functions = {
        'iris': load_dataset_iris,
        'wine': load_dataset_wine,
        'breast_cancer': load_dataset_breast_cancer,
        'diabetes': load_dataset_diabetes,
        'california_housing_3': load_dataset_california_housing_3,
        'california_housing_11': load_dataset_california_housing_11,
    }
        
    return load_cached_dataset(dataset_name, loading_functions[dataset_name])
