# data_helpers.py
import pandas as pd
import numpy as np
from sklearn.datasets import load_iris, load_wine, load_breast_cancer

# Available datasets
DATASETS = {
    'iris': load_iris,
    'wine': load_wine,
    'breast_cancer': load_breast_cancer,
}

def get_available_datasets():
    """Return list of available datasets"""
    return list(DATASETS.keys())

def get_dataset_information(dataset_name: str):
    """Get detailed information about a specific dataset"""
    if dataset_name not in DATASETS:
        return {"error": "Dataset not found"}
    
    try:
        dataset = DATASETS[dataset_name]()
        
        return {
            "name": dataset_name,
            "n_samples": dataset.data.shape[0],
            "n_features": dataset.data.shape[1],
            "feature_names": list(dataset.feature_names),
            "target_names": list(dataset.target_names),
            "description": dataset.DESCR if hasattr(dataset, 'DESCR') else "No description available"
        }
        
    except Exception as e:
        return {"error": f"Error loading dataset: {str(e)}"}

def load_dataset(dataset_name: str):
    """Load a dataset and return features, target, and metadata"""
    if dataset_name not in DATASETS:
        raise ValueError(f"Dataset {dataset_name} not found")
        
    dataset = DATASETS[dataset_name]()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    
    return dataset, feature_names, target_names