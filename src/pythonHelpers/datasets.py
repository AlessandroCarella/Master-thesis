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

def create_mock_dataset(n_rows=100):
    """Create a mock dataset for testing"""
    np.random.seed(42)
    data = {
        "age": np.random.randint(18, 70, n_rows),
        "income": np.random.randint(30000, 150000, n_rows),
        "education_years": np.random.randint(12, 22, n_rows),
        "occupation": np.random.choice(["Engineer", "Teacher", "Doctor", "Sales", "Other"], n_rows),
        "credit_score": np.random.randint(300, 850, n_rows),
        "debt_ratio": np.random.uniform(0, 1, n_rows),
        "employment_length": np.random.randint(0, 30, n_rows),
        "loan_amount": np.random.randint(5000, 50000, n_rows),
        "loan_term": np.random.choice([12, 24, 36, 48, 60], n_rows)
    }
    return pd.DataFrame(data)

def load_dataset(dataset_name: str):
    """Load a dataset and return features, target, and metadata"""
    if dataset_name not in DATASETS:
        raise ValueError(f"Dataset {dataset_name} not found")
        
    dataset = DATASETS[dataset_name]()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    
    return dataset.data, dataset.target, feature_names, target_names