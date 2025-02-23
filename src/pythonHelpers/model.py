from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from lore_sa.dataset import TabularDataset
from typing import Dict, Any
import numpy as np

from pythonHelpers.datasets import load_dataset
from pythonHelpers.lore import load_cached_classifier
        
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
        return RandomForestClassifier(**parameters)
    elif classifier_name == "LogisticRegression":
        return LogisticRegression(**parameters)
    elif classifier_name == "SVC":
        return SVC(**parameters)
    elif classifier_name == "KNeighborsClassifier":
        return KNeighborsClassifier(**parameters)
    elif classifier_name == "GradientBoostingClassifier":
        return GradientBoostingClassifier(**parameters)
    else:
        raise ValueError(f"Unsupported classifier: {classifier_name}")

def train_model_with_lore(dataset_name: str, classifier_name: str, parameters: Dict[str, Any]):
    """
    Train a machine learning model using the LORE framework.

    This function loads a dataset, prepares it for LORE by converting it into a suitable format,
    creates the specified classifier, and then trains the model using LORE's generalized training function.

    Args:
        dataset_name (str): The name of the dataset to load.
        classifier_name (str): The name of the classifier to use.
        parameters (Dict[str, Any]): A dictionary of parameters for initializing the classifier.

    Returns:
        A tuple containing:
            - The trained model as returned by train_model_generalized.
            - The prepared LORE dataset (an instance of TabularDataset).

    Process:
        1. Load the dataset using the provided dataset name.
        2. Extract features and target values from the dataset.
        3. Prepare a data dictionary that maps feature names to their corresponding data columns.
        4. Map the target indices to their names and add as a 'target' column.
        5. Create a LORE TabularDataset from the data dictionary and drop any missing values.
        6. Instantiate the classifier using create_classifier.
        7. Train the model using LORE's train_model_generalized function.
    """
    # Load dataset and corresponding metadata (feature names and target names)
    dataset, feature_names, target_names = load_dataset(dataset_name)
    
    # Extract feature matrix X and target vector y
    X = dataset.data
    y = dataset.target

    if not isinstance(X, np.ndarray):
        X = X.to_numpy()

    # Prepare a dictionary for LORE where each feature name maps to its data column
    data_dict = {name: X[:, i] for i, name in enumerate(feature_names)}
    
    # Define the name of the target column and map target indices to target names
    target_name = 'target'
    data_dict[target_name] = [target_names[i] for i in y]
    
    # Create a LORE-compatible TabularDataset from the dictionary and clean the data by dropping missing values
    dataset = TabularDataset.from_dict(data_dict, target_name)
    dataset.df.dropna(inplace=True)
    
    # Create the classifier instance with the provided parameters
    classifier = create_classifier(classifier_name, parameters)
    
    # Train the model using the LORE generalized training function
    trained_model = load_cached_classifier(
        dataset=dataset,
        target_name=target_name,
        dataset_name=dataset_name,
        classifier=classifier,
        classifier_name=classifier_name
    )
    
    return trained_model, dataset
