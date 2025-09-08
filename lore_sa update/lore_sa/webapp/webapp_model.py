from typing import Dict, Any, Tuple, Union
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier

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
    Get available machine learning classifiers with their default parameters.
    
    Returns
    -------
    Dict[str, Dict[str, Any]]
        Dictionary mapping classifier names to their default parameter configurations.
        
    Notes
    -----
    Provides standardized access to supported classifiers and their
    sensible default hyperparameters for webapp integration.
    """
    return CLASSIFIERS


def create_classifier(classifier_name: str, parameters: Dict[str, Any]) -> Union[
    RandomForestClassifier, LogisticRegression, SVC, KNeighborsClassifier, GradientBoostingClassifier
]:
    """
    Create sklearn classifier instance with specified parameters.
    
    Parameters
    ----------
    classifier_name : str
        Name of the classifier to create. Must be one of the supported types.
    parameters : Dict[str, Any]
        Hyperparameters to configure the classifier.
        
    Returns
    -------
    Union[RandomForestClassifier, LogisticRegression, SVC, KNeighborsClassifier, GradientBoostingClassifier]
        Configured sklearn classifier instance.
        
    Raises
    ------
    ValueError
        If classifier_name is not supported.
        
    Notes
    -----
    Factory function that instantiates the appropriate sklearn classifier
    based on the provided name and configuration parameters.
    """
    classifier_map = {
        "RandomForestClassifier": RandomForestClassifier,
        "LogisticRegression": LogisticRegression,
        "SVC": SVC,
        "KNeighborsClassifier": KNeighborsClassifier,
        "GradientBoostingClassifier": GradientBoostingClassifier,
    }
    
    if classifier_name not in classifier_map:
        raise ValueError(f"Unsupported classifier: {classifier_name}")
    
    classifier_class = classifier_map[classifier_name]
    return classifier_class(**parameters)


def train_model_with_lore(dataset_name: str, classifier_name: str, 
                         parameters: Dict[str, Any]) -> Tuple[Any, Any, Any]:
    """
    Train machine learning model using LORE methodology with caching.
    
    Parameters
    ----------
    dataset_name : str
        Name of the dataset to train on.
    classifier_name : str
        Type of classifier to use for training.
    parameters : Dict[str, Any]
        Hyperparameters for the classifier.
        
    Returns
    -------
    Tuple[Any, Any, Any]
        Trained model wrapper, dataset object, and feature names.
        
    Notes
    -----
    Integrates classifier creation with LORE's caching system for
    efficient model training and reuse across explanation sessions.
    """
    classifier = create_classifier(classifier_name, parameters)

    from .webapp_lore import load_cached_classifier
    trained_model, dataset, feature_names = load_cached_classifier(
        dataset_name=dataset_name,
        classifier=classifier,
        classifier_name=classifier_name
    )

    return trained_model, dataset, feature_names
