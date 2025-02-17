# model_helpers.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from lore_sa.dataset import TabularDataset
from typing import Dict, Any

from pythonHelpers.datasets import load_dataset
from pythonHelpers.lore import tutorial_train_model_generalized
        
# Available classifiers and their default parameters
CLASSIFIERS = {
    'RandomForestClassifier': {
        'n_estimators': 100,
        'max_depth': None,
        'min_samples_split': 2,
        'min_samples_leaf': 1
    },
    'LogisticRegression': {
        'C': 1.0,
        'max_iter': 100,
        'penalty': 'l2'
    }
}

def get_available_classifiers():
    """Return available classifiers and their parameters"""
    return CLASSIFIERS

def create_classifier(classifier_name: str, parameters: Dict[str, Any]):
    """Create a classifier instance with specified parameters"""
    if classifier_name == "RandomForestClassifier":
        return RandomForestClassifier(**parameters)
    elif classifier_name == "LogisticRegression":
        return LogisticRegression(**parameters)
    else:
        raise ValueError(f"Unsupported classifier: {classifier_name}")

def train_model_with_lore(dataset_name: str, classifier_name: str, parameters: Dict[str, Any]):
    """Train a model using LORE"""
    # Load and prepare dataset
    X, y, feature_names, target_names = load_dataset(dataset_name)
    
    # Prepare data for LORE
    data_dict = {name: X[:, i] for i, name in enumerate(feature_names)}
    target_name = 'target'
    data_dict[target_name] = [target_names[i] for i in y]
    
    # Create LORE dataset
    dataset = TabularDataset.from_dict(data_dict, 'target')
    dataset.df.dropna(inplace=True)
    
    # Create and train classifier
    classifier = create_classifier(classifier_name, parameters)
    
    # Train model using LORE
    return tutorial_train_model_generalized(
        dataset=dataset,
        target_name=target_name,
        classifier=classifier
    )