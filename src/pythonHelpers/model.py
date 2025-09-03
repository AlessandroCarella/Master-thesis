from typing import Dict, Any

"""
Module for training machine learning classifiers using the LORE framework.

This module provides helper functions to retrieve available classifiers with their default parameters,
create classifier instances with specified hyperparameters, and train models using the LORE framework.
"""
# Dictionary of available classifiers and their default parameters.
CLASSIFIERS = {
    'RandomForestClassifier': {
        'n_estimators': 100,
        'max_depth': None,
        'min_samples_split': 2,
        'min_samples_leaf': 1,
        'random_state': 42,
    },
    'LogisticRegression': {
        'C': 1.0,
        'max_iter': 100,
        'penalty': 'l2',
        'random_state': 42,
    },
    'SVC': {
        'C': 1.0,
        'kernel': 'rbf',
        'gamma': 'scale',
        'random_state': 42,
    },
    'KNeighborsClassifier': {
        'n_neighbors': 5,
        'weights': 'uniform',
        'algorithm': 'auto',
    },
    'GradientBoostingClassifier': {
        'n_estimators': 100,
        'learning_rate': 0.1,
        'max_depth': 3,
        'random_state': 42,
    }
}

def get_available_classifiers() -> Dict[str, Dict[str, Any]]:
    """
    Retrieve the dictionary of available classifiers along with their default parameters.

    Returns:
        Dict[str, Dict[str, Any]]: A dictionary where keys are classifier names and values are dictionaries 
        of their corresponding default hyperparameters.
    """
    return CLASSIFIERS

def create_classifier(classifier_name: str, parameters: Dict[str, Any]):
    """
    Create an instance of a classifier based on the given name and parameters.

    Args:
        classifier_name (str): The name of the classifier to instantiate.
        parameters (Dict[str, Any]): A dictionary of parameters to initialize the classifier.

    Returns:
        An instance of the specified classifier initialized with the provided parameters.

    Raises:
        ValueError: If the provided classifier_name is not supported.
    """
    if classifier_name == "RandomForestClassifier":
        from sklearn.ensemble import RandomForestClassifier
        return RandomForestClassifier(**parameters)
    elif classifier_name == "LogisticRegression":
        from sklearn.linear_model import LogisticRegression
        return LogisticRegression(**parameters)
    elif classifier_name == "SVC":
        from sklearn.svm import SVC
        return SVC(**parameters)
    elif classifier_name == "KNeighborsClassifier":
        from sklearn.neighbors import KNeighborsClassifier
        return KNeighborsClassifier(**parameters)
    elif classifier_name == "GradientBoostingClassifier":
        from sklearn.ensemble import GradientBoostingClassifier
        return GradientBoostingClassifier(**parameters)
    else:
        raise ValueError(f"Unsupported classifier: {classifier_name}")

def train_model_with_lore(dataset_name: str, classifier_name: str, parameters: Dict[str, Any]):
    """
    Train a machine learning model using the LORE framework with optimized caching.

    This function creates the specified classifier and leverages cached results when available
    to avoid expensive dataset preparation operations. The heavy lifting of dataset loading,
    preparation, and model training is only performed when no cached classifier exists.

    Args:
        dataset_name (str): The name of the dataset to load.
        classifier_name (str): The name of the classifier to use.
        parameters (Dict[str, Any]): A dictionary of parameters for initializing the classifier.

    Returns:
        A tuple containing:
            - The trained model (classifier_bbox) as returned by load_cached_classifier.
            - The prepared LORE dataset (an instance of TabularDataset).
            - The original feature names from the dataset.

    Process:
        1. Create the classifier instance using the provided classifier name and parameters.
        2. Call load_cached_classifier which handles caching logic and dataset preparation.
        3. Return the trained model, prepared dataset, and feature names.
        
    Performance Notes:
        - When a cached classifier exists, this function avoids expensive operations like
          dataset loading, data dictionary creation, and TabularDataset preparation.
        - Only when no cache is available does it perform the full preparation pipeline.
    """
    # Create the classifier instance with the provided parameters
    classifier = create_classifier(classifier_name, parameters)

    from pythonHelpers.lore import load_cached_classifier
    # Load cached classifier or train new one with optimized caching
    trained_model, dataset, feature_names = load_cached_classifier(
        dataset_name=dataset_name,
        classifier=classifier,
        classifier_name=classifier_name
    )

    return trained_model, dataset, feature_names
