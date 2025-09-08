from typing import Dict, List, Tuple, Any, Union
import numpy as np
import pandas as pd
import os
import joblib
import logging
from sklearn.datasets import (
    load_iris, load_wine, load_breast_cancer, load_diabetes, 
    fetch_california_housing, fetch_openml
)
from sklearn.preprocessing import LabelEncoder

DATASETS = {
    'iris': 'tabular',
    'wine': 'tabular', 
    'breast_cancer': 'tabular',
    'diabetes': 'tabular',
    'adult': 'tabular',
    'adult_5': 'tabular',
    'german': 'tabular',
    'california_housing_3': 'tabular',
    'california_housing_11': 'tabular',
}


class MockDataset:
    """
    Mock dataset wrapper for custom processed data.
    
    Attributes
    ----------
    data : Any
        Feature matrix or DataFrame.
    target : Any 
        Target labels or values.
    """
    
    def __init__(self, data: Any, target: Any) -> None:
        """
        Initialize mock dataset with data and target.
        
        Parameters
        ----------
        data : Any
            Feature data.
        target : Any
            Target labels or values.
        """
        self.data = data
        self.target = target


def get_available_datasets() -> Dict[str, str]:
    """
    Get dictionary of available datasets and their types.
    
    Returns
    -------
    Dict[str, str]
        Mapping of dataset names to their types.
    """
    return DATASETS


def get_dataset_information_iris() -> Dict[str, Any]:
    """
    Get metadata information for Iris dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata including sample count, feature names, and target names.
    """
    dataset = load_iris()
    return {
        "name": "iris",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": list(dataset.target_names),
    }


def get_dataset_information_wine() -> Dict[str, Any]:
    """
    Get metadata information for Wine dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata including sample count, feature names, and target names.
    """
    dataset = load_wine()
    return {
        "name": "wine",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": list(dataset.target_names),
    }


def get_dataset_information_breast_cancer() -> Dict[str, Any]:
    """
    Get metadata information for Breast Cancer dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with reordered target names.
        
    Notes
    -----
    Swaps target names order for consistent positive/negative labeling.
    """
    dataset = load_breast_cancer()
    target_names = list(dataset.target_names)
    target_names[0], target_names[1] = target_names[1], target_names[0]
    return {
        "name": "breast_cancer",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }


def get_dataset_information_diabetes() -> Dict[str, Any]:
    """
    Get metadata information for Diabetes dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with custom binary target names.
        
    Notes
    -----
    Creates binary classification target names since original is regression.
    """
    dataset = load_diabetes()
    target_names = ['diabetic', 'non-diabetic']
    return {
        "name": "diabetes",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }


def get_dataset_information_california_housing_3() -> Dict[str, Any]:
    """
    Get metadata information for California Housing 3-class dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with 3-class price categorization.
    """
    dataset = fetch_california_housing()
    target_names = ['high_price', 'low_price', 'medium_price']
    return {
        "name": "california_housing_3",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }


def get_dataset_information_california_housing_11() -> Dict[str, Any]:
    """
    Get metadata information for California Housing 11-class dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with 11 percentile-based classes.
    """
    dataset = fetch_california_housing()
    target_names = [f'percentile_{i}' for i in range(11)]
    return {
        "name": "california_housing_11",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.feature_names),
        "target_names": target_names,
    }


def get_dataset_information_adult() -> Dict[str, Any]:
    """
    Get metadata information for Adult Census dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with income-based target names.
    """
    dataset = fetch_openml(name='adult', version=2, as_frame=True)
    target_names = ['<=50K', '>50K']
    return {
        "name": "adult",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.data.columns),
        "target_names": target_names,
    }


def get_dataset_information_adult_5() -> Dict[str, Any]:
    """
    Get metadata information for Adult Census 5-class dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with 5-level income categorization.
    """
    dataset = fetch_openml(name='adult', version=2, as_frame=True)
    target_names = ['very_low_income', 'low_income', 'medium_income', 'high_income', 'very_high_income']
    return {
        "name": "adult",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.data.columns),
        "target_names": target_names,
    }


def get_dataset_information_german() -> Dict[str, Any]:
    """
    Get metadata information for German Credit dataset.
    
    Returns
    -------
    Dict[str, Any]
        Dataset metadata with credit risk target names.
    """
    dataset = fetch_openml(name='credit-g', version=1, as_frame=True)
    target_names = ['bad', 'good']
    return {
        "name": "german",
        "n_samples": dataset.data.shape[0],
        "feature_names": list(dataset.data.columns),
        "target_names": target_names,
    }


def load_cached_dataset_information(dataset_name: str, info_function: callable, 
                                  cache_dir: str = 'webapp cache') -> Dict[str, Any]:
    """
    Load dataset information from cache or generate and cache it.
    
    Parameters
    ----------
    dataset_name : str
        Name of the dataset.
    info_function : callable
        Function to generate dataset information.
    cache_dir : str, default='webapp cache'
        Directory for caching dataset information.
        
    Returns
    -------
    Dict[str, Any]
        Dataset metadata information.
        
    Notes
    -----
    Implements caching to avoid repeated metadata computation for datasets.
    """
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f'{dataset_name}_info.pkl')
    
    if os.path.exists(cache_file):
        info = joblib.load(cache_file)
        logging.info(f"Loaded {dataset_name} information from webapp cache.")
    else:
        info = info_function()
        joblib.dump(info, cache_file)
        logging.info(f"Cached {dataset_name} information to file.")
    
    return info


def load_dataset_iris() -> Tuple[Any, List[str], List[str]]:
    """
    Load Iris classification dataset.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object, feature names, and target names.
    """
    dataset = load_iris()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names


def load_dataset_wine() -> Tuple[Any, List[str], List[str]]:
    """
    Load Wine classification dataset.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object, feature names, and target names.
    """
    dataset = load_wine()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names


def load_dataset_breast_cancer() -> Tuple[Any, List[str], List[str]]:
    """
    Load Breast Cancer classification dataset.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object, feature names, and target names.
    """
    dataset = load_breast_cancer()
    feature_names = list(dataset.feature_names)
    target_names = list(dataset.target_names)
    return dataset, feature_names, target_names


def load_dataset_diabetes() -> Tuple[Any, List[str], List[str]]:
    """
    Load Diabetes dataset converted to binary classification.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object with binary targets, feature names, and target names.
        
    Notes
    -----
    Converts continuous diabetes progression to binary classification
    using mean threshold for class assignment.
    """
    dataset = load_diabetes()
    feature_names = list(dataset.feature_names)
    target_names = ['non-diabetic', 'diabetic']
    dataset.target = (dataset.target > dataset.target.mean()).astype(int)
    return dataset, feature_names, target_names


def load_dataset_california_housing_3() -> Tuple[Any, List[str], List[str]]:
    """
    Load California Housing dataset converted to 3-class classification.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object with 3-class targets, feature names, and target names.
        
    Notes
    -----
    Converts house prices to 3 classes based on 33rd and 66th percentiles.
    """
    dataset = fetch_california_housing()
    feature_names = list(dataset.feature_names)
    target_names = ['medium_price', 'low_price', 'high_price']
    
    prices = dataset.target
    low_threshold = np.percentile(prices, 33.33)
    high_threshold = np.percentile(prices, 66.66)
    
    dataset.target = np.zeros_like(prices, dtype=int)
    dataset.target[(prices > low_threshold) & (prices <= high_threshold)] = 1
    dataset.target[prices > high_threshold] = 2
    
    return dataset, feature_names, target_names


def load_dataset_california_housing_11() -> Tuple[Any, List[str], List[str]]:
    """
    Load California Housing dataset converted to 11-class classification.
    
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object with 11-class targets, feature names, and target names.
        
    Notes
    -----
    Converts house prices to 11 classes based on decile percentiles.
    """
    dataset = fetch_california_housing()
    feature_names = list(dataset.feature_names)
    target_names = [f'percentile_{i}' for i in range(11)]
    
    prices = dataset.target
    percentiles = np.percentile(prices, np.linspace(0, 100, 12))
    dataset.target = np.digitize(prices, percentiles, right=True) - 1
    
    return dataset, feature_names, target_names


def load_dataset_adult() -> Tuple[MockDataset, List[str], List[str]]:
    """
    Load Adult Census dataset with data cleaning.
    
    Returns
    -------
    Tuple[MockDataset, List[str], List[str]]
        Processed dataset object, feature names, and target names.
        
    Notes
    -----
    Applies comprehensive data cleaning including missing value imputation
    and maintains original OpenML data types for categorical features.
    Limits to 5000 samples for computational efficiency.
    """
    dataset = fetch_openml(name='adult', version=2, as_frame=True)
    
    X = dataset.data.copy().iloc[:5000]
    y = dataset.target.iloc[:5000]
    
    numerical_cols = X.select_dtypes(include=[np.number]).columns
    X[numerical_cols] = X[numerical_cols].replace([np.inf, -np.inf], np.nan)
    for col in numerical_cols:
        if X[col].isna().any():
            X[col] = X[col].fillna(X[col].median())
    
    categorical_cols = X.select_dtypes(include=['category']).columns
    for col in categorical_cols:
        if X[col].isna().any():
            most_frequent = X[col].mode().iloc[0] if not X[col].mode().empty else 'Unknown'
            X[col] = X[col].fillna(most_frequent)
    
    target_names = list(dataset.target.unique())
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y.values)
    target_names = list(label_encoder.classes_)
    feature_names = list(dataset.data.columns)
    
    mock_dataset = MockDataset(X, y)
    return mock_dataset, feature_names, target_names


def load_dataset_adult_5() -> Tuple[MockDataset, List[str], List[str]]:
    """
    Load Adult Census dataset with 5-class income categorization.
    
    Returns
    -------
    Tuple[MockDataset, List[str], List[str]]
        Processed dataset with 5 income classes, feature names, and target names.
        
    Notes
    -----
    Creates 5 income categories by combining age, education, and work hours
    with original income binary classification to create more nuanced classes.
    """
    dataset = fetch_openml(name='adult', version=2, as_frame=True)
    
    X = dataset.data.copy().iloc[:5000]
    y = dataset.target.iloc[:5000]
    
    numerical_cols = X.select_dtypes(include=[np.number]).columns
    X[numerical_cols] = X[numerical_cols].replace([np.inf, -np.inf], np.nan)
    for col in numerical_cols:
        if X[col].isna().any():
            X[col] = X[col].fillna(X[col].median())
    
    categorical_cols = X.select_dtypes(include=['category']).columns
    for col in categorical_cols:
        if X[col].isna().any():
            most_frequent = X[col].mode().iloc[0] if not X[col].mode().empty else 'Unknown'
            X[col] = X[col].fillna(most_frequent)
    
    # Create 5 income classes using age, education, and hours-per-week as additional factors
    # This creates more nuanced income categories beyond just <=50K and >50K
    
    # Get relevant features for income classification
    age = X['age'] if 'age' in X.columns else X.iloc[:, 0]  # fallback
    education_num = X['education-num'] if 'education-num' in X.columns else X.iloc[:, 4]  # fallback
    hours_per_week = X['hours-per-week'] if 'hours-per-week' in X.columns else X.iloc[:, 12]  # fallback
    
    # Create income score based on multiple factors
    # Normalize features to 0-1 scale
    age_norm = (age - age.min()) / (age.max() - age.min())
    edu_norm = (education_num - education_num.min()) / (education_num.max() - education_num.min())
    hours_norm = (hours_per_week - hours_per_week.min()) / (hours_per_week.max() - hours_per_week.min())
    
    income_score = 0.5 * edu_norm + 0.3 * hours_norm + 0.2 * age_norm
    
    y_new = np.zeros(len(y), dtype=int)
    
    low_income_mask = (y == '<=50K')
    low_income_scores = income_score[low_income_mask]
    
    if len(low_income_scores) > 0:
        low_q33 = np.percentile(low_income_scores, 33.33)
        low_q66 = np.percentile(low_income_scores, 66.66)
        
        very_low_mask = low_income_mask & (income_score <= low_q33)
        y_new[very_low_mask] = 0
        
        low_mask = low_income_mask & (income_score > low_q33) & (income_score <= low_q66)
        y_new[low_mask] = 1
        
        medium_mask = low_income_mask & (income_score > low_q66)
        y_new[medium_mask] = 2
    
    high_income_mask = (y == '>50K')
    high_income_scores = income_score[high_income_mask]
    
    if len(high_income_scores) > 0:
        high_median = np.percentile(high_income_scores, 50)
        
        high_mask = high_income_mask & (income_score <= high_median)
        y_new[high_mask] = 3
        
        very_high_mask = high_income_mask & (income_score > high_median)
        y_new[very_high_mask] = 4
    
    target_names = ['very_low_income', 'low_income', 'medium_income', 'high_income', 'very_high_income']
    feature_names = list(dataset.data.columns)
    
    mock_dataset = MockDataset(X, y_new)
    return mock_dataset, feature_names, target_names


def load_dataset_german() -> Tuple[MockDataset, List[str], List[str]]:
    """
    Load German Credit dataset with data cleaning.
    
    Returns
    -------
    Tuple[MockDataset, List[str], List[str]]
        Processed dataset object, feature names, and target names.
        
    Notes
    -----
    Applies data cleaning and maintains categorical data types from OpenML.
    """
    dataset = fetch_openml(name='credit-g', version=1, as_frame=True)
    
    X = dataset.data.copy()
    
    numerical_cols = X.select_dtypes(include=[np.number]).columns
    X[numerical_cols] = X[numerical_cols].replace([np.inf, -np.inf], np.nan)
    for col in numerical_cols:
        if X[col].isna().any():
            X[col] = X[col].fillna(X[col].median())
    
    categorical_cols = X.select_dtypes(include=['category']).columns
    for col in categorical_cols:
        if X[col].isna().any():
            most_frequent = X[col].mode().iloc[0] if not X[col].mode().empty else 'Unknown'
            X[col] = X[col].fillna(most_frequent)
    
    target_names = list(dataset.target.unique())
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(dataset.target.values)
    target_names = list(label_encoder.classes_)
    feature_names = list(dataset.data.columns)
    
    mock_dataset = MockDataset(X, y)
    return mock_dataset, feature_names, target_names


def load_cached_dataset(dataset_name: str, load_function: callable, 
                       cache_dir: str = 'webapp cache') -> Tuple[Any, List[str], List[str]]:
    """
    Load dataset from cache or generate and cache it.
    
    Parameters
    ----------
    dataset_name : str
        Name of the dataset to load.
    load_function : callable
        Function to load the dataset if not cached.
    cache_dir : str, default='webapp cache'
        Directory for caching dataset files.
        
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object, feature names, and target names.
        
    Notes
    -----
    Implements dataset caching to avoid repeated loading and processing
    of large datasets. Critical for performance with OpenML datasets.
    """
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f'{dataset_name}.pkl')
    
    if os.path.exists(cache_file):
        dataset = joblib.load(cache_file)
        logging.info(f"Loaded {dataset_name} from webapp cache.")
        return dataset
    
    dataset = load_function()
    
    joblib.dump(dataset, cache_file)
    logging.info(f"Cached {dataset_name} to file.")
    
    return dataset


def get_dataset_information(dataset_name: str, cache_dir: str = 'webapp cache') -> Dict[str, Any]:
    """
    Get dataset information using cached or fresh computation.
    
    Parameters
    ----------
    dataset_name : str
        Name of the dataset to get information for.
    cache_dir : str, default='webapp cache'
        Directory for information caching.
        
    Returns
    -------
    Dict[str, Any]
        Dataset metadata including features, targets, and sample counts.
        
    Raises
    ------
    KeyError
        If dataset_name is not recognized.
    """
    information_functions = {
        'iris': get_dataset_information_iris,
        'wine': get_dataset_information_wine,
        'breast_cancer': get_dataset_information_breast_cancer,
        'diabetes': get_dataset_information_diabetes,
        'adult': get_dataset_information_adult,
        'adult_5': get_dataset_information_adult_5,
        'german': get_dataset_information_german,
        'california_housing_3': get_dataset_information_california_housing_3,
        'california_housing_11': get_dataset_information_california_housing_11,
    }
    
    return load_cached_dataset_information(dataset_name, information_functions[dataset_name], cache_dir=cache_dir)
        

def load_dataset(dataset_name: str) -> Tuple[Any, List[str], List[str]]:
    """
    Load specified dataset with caching support.
    
    Parameters
    ----------
    dataset_name : str
        Name of the dataset to load.
        
    Returns
    -------
    Tuple[Any, List[str], List[str]]
        Dataset object, feature names, and target names.
        
    Raises
    ------
    KeyError
        If dataset_name is not recognized.
        
    Notes
    -----
    Main interface for dataset loading with automatic caching.
    Supports both sklearn built-in datasets and processed OpenML datasets.
    """
    loading_functions = {
        'iris': load_dataset_iris,
        'wine': load_dataset_wine,
        'breast_cancer': load_dataset_breast_cancer,
        'diabetes': load_dataset_diabetes,
        'adult': load_dataset_adult,
        'adult_5': load_dataset_adult_5,
        'german': load_dataset_german,
        'california_housing_3': load_dataset_california_housing_3,
        'california_housing_11': load_dataset_california_housing_11,
    }
    
    result = load_cached_dataset(dataset_name, loading_functions[dataset_name])
    
    return result
