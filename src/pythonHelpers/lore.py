import pandas as pd
import numpy as np
import logging
import os
import joblib

from pythonHelpers.routes.state import global_state

def get_feature_indices(dataset):
    """
    Extract indices for numeric and categorical features from the dataset descriptor.

    Parameters:
        dataset: The dataset object containing a descriptor with feature information.

    Returns:
        tuple: A tuple containing two lists:
            - numeric_indices: Indices of numeric features.
            - categorical_indices: Indices of categorical features.
    """
    # Extract indices for numeric features
    numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
    # Extract indices for categorical features
    categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]
    return numeric_indices, categorical_indices


def create_preprocessor(numeric_indices, categorical_indices):
    """
    Create a preprocessor that applies appropriate transformations to numeric and categorical features.

    Numeric features are scaled using StandardScaler, while categorical features are encoded using OrdinalEncoder.

    Parameters:
        numeric_indices (list): List of indices for numeric features.
        categorical_indices (list): List of indices for categorical features.

    Returns:
        ColumnTransformer: A preprocessor with defined transformations.
    """
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler, OrdinalEncoder
    from sklearn.compose import ColumnTransformer
    
    return ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_indices),    # Scale numeric features
            ('cat', OrdinalEncoder(), categorical_indices)   # Encode categorical features
        ]
    )


def filter_rare_classes(dataset, target_name: str):
    """
    Filter out rows in the dataset that belong to target classes with only one occurrence.
    
    This helps avoid issues with stratified sampling or model training due to rare classes.

    Parameters:
        dataset: The dataset object containing the dataframe.
        target_name (str): The name of the target column.
    """
    # Get value counts for each target class
    valid_classes = dataset.df[target_name].value_counts()
    # Identify classes with more than one occurrence
    valid_classes = valid_classes[valid_classes > 1].index
    # Filter the dataframe to include only valid classes
    dataset.df = dataset.df[dataset.df[target_name].isin(valid_classes)]


def split_dataset(dataset, numeric_indices, categorical_indices, target_name: str):
    """
    Split the dataset into training and testing sets using stratified sampling on the target variable.

    Parameters:
        dataset: The dataset object containing the dataframe.
        numeric_indices (list): List of indices for numeric features.
        categorical_indices (list): List of indices for categorical features.
        target_name (str): The name of the target column.

    Returns:
        tuple: A tuple containing the training and testing splits (X_train, X_test, y_train, y_test).
    """
    from sklearn.model_selection import train_test_split
    
    # Select features by combining numeric and categorical indices
    X = dataset.df.iloc[:, numeric_indices + categorical_indices]
    # Select the target variable
    y = dataset.df[target_name]
    # Split the data into train and test sets with stratification based on the target variable
    return train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)


def train_model_generalized(dataset, target_name: str, classifier=None):
    """
    Train a generalized classification model using a pipeline with preprocessing and a classifier.

    If no classifier is provided, a RandomForestClassifier with 100 trees is used.
    The function also filters out rare classes, splits the data, and wraps the trained model
    using a black-box interface.

    Parameters:
        dataset: The dataset object containing the dataframe and descriptor.
        target_name (str): The name of the target column.
        classifier (optional): A scikit-learn classifier. Defaults to RandomForestClassifier.

    Returns:
        object: A black-box classifier object wrapped using sklearn_classifier_bbox.
    """
    from sklearn.pipeline import make_pipeline
    from lore_sa.bbox import sklearn_classifier_bbox
    
    # Use default classifier if none provided
    if classifier is None:
        from sklearn.ensemble import RandomForestClassifier
        classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    
    # Retrieve indices for numeric and categorical features
    numeric_indices, categorical_indices = get_feature_indices(dataset)
    
    # Create the preprocessor with appropriate transformers
    preprocessor = create_preprocessor(numeric_indices, categorical_indices)
    
    # Filter out rare classes from the dataset
    filter_rare_classes(dataset, target_name)
    
    # Split the dataset into training and testing subsets
    X_train, X_test, y_train, y_test = split_dataset(dataset, numeric_indices, categorical_indices, target_name)

    # Create a pipeline that applies preprocessing and then the classifier
    model = make_pipeline(preprocessor, classifier)
    model.fit(X_train, y_train)
    
    # Return the black-box wrapper for the trained model
    return sklearn_classifier_bbox.sklearnBBox(model), X_train, X_test, y_train, y_test


def prepare_dataset_and_train_classifier(dataset_name: str, target_name: str, classifier: any, classifier_name: str):
    """
    Prepare dataset and train classifier when no cached version is available.
    
    This internal method handles the complete pipeline of dataset preparation and model training:
    - Loads the raw dataset and extracts features and targets
    - Prepares the data dictionary mapping feature names to data columns
    - Creates a LORE-compatible TabularDataset and cleans it
    - Trains the classifier using the generalized training function
    
    Parameters:
        dataset_name (str): The name of the dataset to load.
        target_name (str): The name of the target column.
        classifier (any): A scikit-learn classifier instance.
        classifier_name (str): The name/identifier of the classifier.
    
    Returns:
        tuple: A tuple containing (classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names)
            where dataset is the prepared TabularDataset and feature_names are the original feature names.
    """
    from pythonHelpers.datasets import load_dataset
    # Load dataset and corresponding metadata (feature names and target names)
    raw_dataset, feature_names, target_names = load_dataset(dataset_name)
    
    # Extract feature matrix X and target vector y
    X = raw_dataset.data
    y = raw_dataset.target

    if not isinstance(X, np.ndarray):
        X = X.to_numpy()

    # Prepare a dictionary for LORE where each feature name maps to its data column
    data_dict = {name: X[:, i] for i, name in enumerate(feature_names)}
    
    # Map target indices to target names and add as target column
    data_dict[target_name] = [target_names[i] for i in y]
    
    from lore_sa.dataset import TabularDataset
    # Create a LORE-compatible TabularDataset from the dictionary and clean the data
    dataset = TabularDataset.from_dict(data_dict, target_name)
    dataset.df.dropna(inplace=True)
    
    # Train the model using the LORE generalized training function
    classifier_bbox, X_train, X_test, y_train, y_test = train_model_generalized(dataset, target_name, classifier)
    
    return classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names


def load_cached_classifier(dataset_name: str, target_name: str, classifier: any, classifier_name: str, cache_dir='cache'):
    """
    Load a cached trained classifier if available; otherwise, prepare dataset and train it, then cache the result.
    
    This function first checks for a cached classifier to avoid expensive preprocessing operations.
    Only when no cache is found does it perform the full dataset preparation and training pipeline.
    
    The cache file name is constructed uniquely based on:
      - The dataset name
      - The target variable name  
      - The classifier's parameters (via joblib.hash)
      
    Parameters:
        dataset_name (str): The name of the dataset to load.
        target_name (str): The name of the target column.
        classifier (any): A scikit-learn classifier instance.
        classifier_name (str): The name/identifier of the classifier.
        cache_dir (str, optional): Directory where the cached classifier will be stored. Defaults to 'cache'.
    
    Returns:
        tuple: A tuple containing (classifier_bbox, dataset, feature_names) where:
            - classifier_bbox: A black-box classifier object wrapped using sklearn_classifier_bbox
            - dataset: The prepared TabularDataset used for training
            - feature_names: List of original feature names from the dataset
    """
    # Ensure cache directory exists
    os.makedirs(cache_dir, exist_ok=True)
            
    # Generate a hash of the classifier parameters to ensure uniqueness based on its configuration
    classifier_params_hash = joblib.hash(classifier.get_params())
    
    # Create a unique cache file name
    cache_file = os.path.join(
        cache_dir, 
        f'classifier_{dataset_name}_{target_name}_{classifier_name}_{classifier_params_hash}.pkl'
    )
    
    if os.path.exists(cache_file):
        # Load from cache - this skips all expensive preprocessing
        cached_data = joblib.load(cache_file)
        classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names = cached_data
        logging.info(f"Loaded classifier for {dataset_name} from cache.")
    else:
        # No cache found - perform full dataset preparation and training
        classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names = prepare_dataset_and_train_classifier(
            dataset_name, target_name, classifier, classifier_name
        )
        # Cache all results including dataset and feature names for future fast loading
        joblib.dump((classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names), cache_file)
        logging.info(f"Cached classifier for {dataset_name} to file.")
        
    # Set global state as before
    global_state.X_train = X_train
    global_state.y_train = y_train
    global_state.X_test = X_test
    global_state.y_test = y_test

    return classifier_bbox, dataset, feature_names

def create_neighbourhood_with_lore(instance: pd.Series, bbox, dataset, neighbourhood_size=100):
    """
    Generate a neighbourhood of instances around a given instance using LORE (Local Rule-based Explanation).

    This function encodes the input instance, generates a neighbourhood in the encoded space,
    removes duplicates, ensures the instance is at the beginning of the neighbourhood, decodes
    the neighbourhood back to the original space, obtains predictions from the black-box model,
    and encodes the target predictions.

    Parameters:
        instance (pd.Series): The input instance for which to generate the neighbourhood.
        bbox: The black-box model used to predict the target variable.
        dataset: The dataset object containing the descriptor and data.
        neighbourhood_size (int, optional): Number of instances to generate in the neighbourhood. Defaults to 100.

    Returns:
        tuple: A tuple containing:
            - neighbourhood: Encoded neighbourhood instances.
            - neighb_train_X: Decoded neighbourhood instances in original feature space.
            - neighb_train_y: Predictions from the black-box model on the decoded instances.
            - neighb_train_yz: Encoded target predictions.
    """
    # Import only when needed
    from lore_sa.encoder_decoder import ColumnTransformerEnc
    from lore_sa.neighgen import GeneticGenerator
    
    def remove_duplicates(neighbourhood):
        """Remove duplicate rows from the neighbourhood."""
        unique_neighbourhood = []
        seen = set()
        for row in neighbourhood:
            row_tuple = tuple(row)
            if row_tuple not in seen:
                unique_neighbourhood.append(row)
                seen.add(row_tuple)
        return np.array(unique_neighbourhood, dtype=neighbourhood.dtype)

    def ensure_instance_in_neighbourhood(instance, neighbourhood):
        """Ensure the instance is present at the end of the neighbourhood."""
        instance_idx = np.where((neighbourhood == instance).all(axis=1))[0]

        if instance_idx.size == 0:
            neighbourhood = np.vstack([neighbourhood, instance])
        elif instance_idx[0] != len(neighbourhood) - 1:
            neighbourhood = np.delete(neighbourhood, instance_idx[0], axis=0)
            neighbourhood = np.vstack([neighbourhood, instance])

        return neighbourhood
    
    # Initialize the encoder/decoder based on the dataset descriptor
    tabular_enc = ColumnTransformerEnc(dataset.descriptor)
    
    # Encode the input instance; [0] to get the first (and only) element of the list
    z = tabular_enc.encode([instance])[0]
    
    # Initialize the Genetic neighbourhood generator 
    gen = GeneticGenerator(bbox=bbox, dataset=dataset, encoder=tabular_enc)
    
    # Generate the neighbourhood in the encoded space
    neighbourhood = gen.generate(z, neighbourhood_size, dataset.descriptor, tabular_enc)
    
    neighbourhood = remove_duplicates(neighbourhood)
    neighbourhood = ensure_instance_in_neighbourhood(instance, neighbourhood)

    # Decode the generated neighbourhood back to the original feature space
    neighb_train_X = tabular_enc.decode(neighbourhood)
    neighb_train_X = ensure_instance_in_neighbourhood(instance, neighb_train_X)
    
    # Get predictions from the black-box model on the decoded neighbourhood instances
    neighb_train_y = bbox.predict(neighb_train_X)
    
    # Encode the target predictions
    neighb_train_yz = tabular_enc.encode_target_class(neighb_train_y.reshape(-1, 1)).squeeze()
    
    return neighbourhood, neighb_train_X, neighb_train_y, neighb_train_yz


def get_lore_decision_tree_surrogate(neighbour, neighb_train_yz):
    """
    Train a decision tree surrogate model using the neighbourhood data and the encoded target predictions.

    The surrogate model approximates the behavior of the black-box model locally,
    aiding in interpretability.

    Parameters:
        neighbour: The neighbourhood data (typically in the encoded space) used for training.
        neighb_train_yz: The encoded target predictions for the neighbourhood data.

    Returns:
        DecisionTreeSurrogate: A trained decision tree surrogate model.
    """
    # Import only when needed
    from lore_sa.surrogate import DecisionTreeSurrogate
    
    # Initialize the decision tree surrogate model
    dt = DecisionTreeSurrogate()
    # Train the surrogate model on the neighbourhood data and encoded target predictions
    return dt.train(neighbour, neighb_train_yz)
