import pandas as pd
import numpy as np
import logging
import os
import joblib

from pythonHelpers.routes.state import global_state

# ---------------- Dataset Descriptor Processing ---------------- #

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
    numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
    categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]
    return numeric_indices, categorical_indices

def get_ordered_feature_names_from_dataset(dataset):
    """Get feature names in correct order based on dataset descriptor indices."""
    feature_names = []
    
    # Collect numeric features with their indices
    for feature_name, info in dataset.descriptor['numeric'].items():
        feature_names.append((info['index'], feature_name))
        
    # Collect categorical features with their indices
    for feature_name, info in dataset.descriptor['categorical'].items():
        feature_names.append((info['index'], feature_name))
    
    # Sort by index and return feature names
    feature_names.sort(key=lambda x: x[0])
    return [name for _, name in feature_names]

# ---------------- Preprocessing Pipeline ---------------- #

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
            ('cat', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1), categorical_indices) # Encode categorical features
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
    
    # Select features while maintaining original column order
    all_feature_indices = sorted(numeric_indices + categorical_indices)
    X = dataset.df.iloc[:, all_feature_indices]
    # Select the target variable
    y = dataset.df[target_name]
    # Split the data into train and test sets with stratification based on the target variable
    return train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

# ---------------- Model Training ---------------- #

def create_default_classifier():
    """Create default RandomForestClassifier for training."""
    from sklearn.ensemble import RandomForestClassifier
    return RandomForestClassifier(n_estimators=100, random_state=42)

def create_training_pipeline(dataset, classifier):
    """Create and configure the complete training pipeline."""
    from sklearn.pipeline import make_pipeline
    
    numeric_indices, categorical_indices = get_feature_indices(dataset)
    preprocessor = create_preprocessor(numeric_indices, categorical_indices)
    
    return make_pipeline(preprocessor, classifier), numeric_indices, categorical_indices

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
    from lore_sa.bbox import sklearn_classifier_bbox
    
    # Use default classifier if none provided
    if classifier is None:
        classifier = create_default_classifier()
    
    # Create training pipeline and get indices
    model, numeric_indices, categorical_indices = create_training_pipeline(dataset, classifier)
    
    # Prepare dataset
    filter_rare_classes(dataset, target_name)
    X_train, X_test, y_train, y_test = split_dataset(dataset, numeric_indices, categorical_indices, target_name)

    # Train model
    model.fit(X_train, y_train)
    
    # Return black-box wrapper
    return sklearn_classifier_bbox.sklearnBBox(model), X_train, X_test, y_train, y_test

# ---------------- Dataset Preparation ---------------- #

def extract_features_and_targets(dataset_name: str):
    """Extract feature matrix and target vector from dataset."""
    from pythonHelpers.datasets import load_dataset
    
    raw_dataset, feature_names, target_names = load_dataset(dataset_name)
    return raw_dataset.data, raw_dataset.target, feature_names, target_names

def prepare_data_dictionary_from_dataframe(X_df, feature_names):
    """Prepare data dictionary from pandas DataFrame preserving dtypes."""
    data_dict = {}
    for name in feature_names:
        series = X_df[name]
        if pd.api.types.is_numeric_dtype(series):
            # Keep numeric data as numpy array
            data_dict[name] = series.values
        else:
            # Keep categorical data as strings/objects
            data_dict[name] = series.astype(str).values
    return data_dict

def prepare_data_dictionary_from_array(X_array, feature_names):
    """Prepare data dictionary from numpy array."""
    if not isinstance(X_array, np.ndarray):
        X_array = X_array.to_numpy()
    return {name: X_array[:, i] for i, name in enumerate(feature_names)}

def create_data_dictionary(X, feature_names, target_names, y, target_name):
    """
    Create a data dictionary for LORE TabularDataset from features and targets.
    
    Handles both pandas DataFrame and numpy array inputs appropriately.
    """
    # Handle pandas DataFrame vs numpy array differently to preserve dtypes
    if isinstance(X, pd.DataFrame):
        data_dict = prepare_data_dictionary_from_dataframe(X, feature_names)
    else:
        data_dict = prepare_data_dictionary_from_array(X, feature_names)
    
    # Map target indices to target names and add as target column
    data_dict[target_name] = [target_names[i] for i in y]
    return data_dict

def create_tabular_dataset(data_dict, target_name):
    """Create and clean LORE-compatible TabularDataset."""
    from lore_sa.dataset import TabularDataset
    
    dataset = TabularDataset.from_dict(data_dict, target_name)
    dataset.df.dropna(inplace=True)
    return dataset

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
    # Load and extract dataset components
    X, y, feature_names, target_names = extract_features_and_targets(dataset_name)
    
    # Create data dictionary and dataset
    data_dict = create_data_dictionary(X, feature_names, target_names, y, target_name)
    dataset = create_tabular_dataset(data_dict, target_name)
    
    # Train the model using the LORE generalized training function
    classifier_bbox, X_train, X_test, y_train, y_test = train_model_generalized(dataset, target_name, classifier)
    
    return classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names

# ---------------- Caching System ---------------- #

def generate_cache_filename(dataset_name: str, target_name: str, classifier_name: str, classifier_params_hash: str, cache_dir: str):
    """Generate unique cache filename based on parameters."""
    return os.path.join(
        cache_dir, 
        f'classifier_{dataset_name}_{target_name}_{classifier_name}_{classifier_params_hash}.pkl'
    )

def load_from_cache(cache_file: str):
    """Load classifier data from cache file."""
    cached_data = joblib.load(cache_file)
    classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names = cached_data
    logging.info(f"Loaded classifier from cache: {cache_file}")
    return classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names

def save_to_cache(cache_file: str, classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names):
    """Save classifier data to cache file."""
    cache_data = (classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names)
    joblib.dump(cache_data, cache_file)
    logging.info(f"Cached classifier to file: {cache_file}")

def update_global_training_state(X_train, y_train, X_test, y_test):
    """Update global state with training data."""
    global_state.X_train = X_train
    global_state.y_train = y_train
    global_state.X_test = X_test
    global_state.y_test = y_test

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
            
    # Generate cache filename
    classifier_params_hash = joblib.hash(classifier.get_params())
    cache_file = generate_cache_filename(dataset_name, target_name, classifier_name, classifier_params_hash, cache_dir)
    
    if os.path.exists(cache_file):
        # Load from cache
        classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names = load_from_cache(cache_file)
    else:
        # Train new classifier and cache
        classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names = prepare_dataset_and_train_classifier(
            dataset_name, target_name, classifier, classifier_name
        )
        save_to_cache(cache_file, classifier_bbox, X_train, X_test, y_train, y_test, dataset, feature_names)
        
    # Update global state
    update_global_training_state(X_train, y_train, X_test, y_test)

    return classifier_bbox, dataset, feature_names

# ---------------- Feature Name Processing ---------------- #

def create_encoded_feature_names(dataset):
    """
    Manually create encoded feature names when automatic methods fail.
    
    Creates encoded feature names by combining numeric features (unchanged) and
    categorical features (one-hot encoded with value suffixes).
    """
    encoded_feature_names = []
    
    # Add numeric feature names (these stay the same)
    for feature_name, info in dataset.descriptor['numeric'].items():
        encoded_feature_names.append(feature_name)
    
    # Add categorical feature names (these get one-hot encoded)
    for feature_name, info in dataset.descriptor['categorical'].items():
        unique_values = info['distinct_values']
        for value in unique_values:
            encoded_feature_names.append(f"{feature_name}_{value}")
    
    return encoded_feature_names

# ---------------- Instance Processing ---------------- #

def convert_instance_to_dataframe(instance, ordered_feature_names):
    """Convert instance to properly ordered DataFrame preserving original format."""
    if isinstance(instance, pd.Series):
        instance_dict = instance.to_dict()
        return pd.DataFrame([{feature: instance_dict[feature] for feature in ordered_feature_names}])
    elif isinstance(instance, dict):
        return pd.DataFrame([{feature: instance[feature] for feature in ordered_feature_names}])
    else:
        if hasattr(instance, 'columns'):
            return instance[ordered_feature_names].copy()
        else:
            return instance

# ---------------- Neighborhood Processing ---------------- #

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

def ensure_instance_at_end_perfect_match(instance_encoded, neighbourhood_encoded):
    """
    Ensure the encoded instance is at the END of the encoded neighbourhood.
    Uses perfect match comparison (np.array_equal) for exact matching.
    """
    # Find exact matches using np.array_equal
    instance_indices = []
    for i, row in enumerate(neighbourhood_encoded):
        if np.array_equal(row, instance_encoded):
            instance_indices.append(i)
    
    if len(instance_indices) == 0:
        # Instance not found, add it to the end
        neighbourhood_encoded = np.vstack([neighbourhood_encoded, instance_encoded])
    else:
        # Remove ALL existing instances of this point
        neighbourhood_encoded = np.delete(neighbourhood_encoded, instance_indices, axis=0)
        # Add exactly one copy to the end
        neighbourhood_encoded = np.vstack([neighbourhood_encoded, instance_encoded])
    
    return neighbourhood_encoded

def ensure_proper_instance_preservation(neighb_train_X, original_instance_dict, ordered_feature_names):
    """Ensure the last row of decoded neighborhood matches the original instance exactly."""
    if len(neighb_train_X) > 0:
        last_index = len(neighb_train_X) - 1
        for feature_name in ordered_feature_names:
            if feature_name in original_instance_dict:
                if hasattr(neighb_train_X, 'iloc'):
                    # DataFrame - use iloc
                    neighb_train_X.iloc[last_index, neighb_train_X.columns.get_loc(feature_name)] = original_instance_dict[feature_name]
                else:
                    # Fallback for array-like objects
                    feature_index = ordered_feature_names.index(feature_name)
                    neighb_train_X[last_index, feature_index] = original_instance_dict[feature_name]

def convert_neighborhood_to_dataframe(neighb_train_X, ordered_feature_names):
    """Convert neighborhood to DataFrame if needed."""
    if isinstance(neighb_train_X, np.ndarray):
        return pd.DataFrame(neighb_train_X, columns=ordered_feature_names)
    return neighb_train_X

# ---------------- Main LORE Functions ---------------- #

def create_neighbourhood_with_lore(instance, bbox, dataset, neighbourhood_size=100):
    """
    Generate a neighbourhood of instances around a given instance using LORE (Local Rule-based Explanation).

    This function encodes the input instance, generates a neighbourhood in the encoded space,
    removes duplicates, ensures the instance is at the beginning of the neighbourhood, decodes
    the neighbourhood back to the original space, obtains predictions from the black-box model,
    and encodes the target predictions.

    Parameters:
        instance: The input instance for which to generate the neighbourhood (dict, pd.Series, or DataFrame).
        bbox: The black-box model used to predict the target variable.
        dataset: The dataset object containing the descriptor and data.
        neighbourhood_size (int, optional): Number of instances to generate in the neighbourhood. Defaults to 100.

    Returns:
        tuple: A tuple containing:
            - neighbourhood: Encoded neighbourhood instances.
            - neighb_train_X: Decoded neighbourhood instances in original feature space.
            - neighb_train_y: Predictions from the black-box model on the decoded instances.
            - neighb_train_yz: Encoded target predictions.
            - encoded_feature_names: List of encoded feature names.
    """
    from lore_sa.encoder_decoder import ColumnTransformerEnc
    from lore_sa.neighgen import GeneticGenerator
    
    # Initialize encoder and get feature order
    tabular_enc = ColumnTransformerEnc(dataset.descriptor)
    ordered_feature_names = get_ordered_feature_names_from_dataset(dataset)
    
    # Convert and prepare instance
    instance_df = convert_instance_to_dataframe(instance, ordered_feature_names)
    original_instance_dict = instance_df.iloc[0].to_dict()
    
    # Encode the input instance
    z = tabular_enc.encode(instance_df)[0]
    
    # Generate neighborhood
    gen = GeneticGenerator(bbox=bbox, dataset=dataset, encoder=tabular_enc)
    neighbourhood = gen.generate(z, neighbourhood_size, dataset.descriptor, tabular_enc)
    
    # Process neighborhood
    neighbourhood = remove_duplicates(neighbourhood)
    neighbourhood = ensure_instance_at_end_perfect_match(z, neighbourhood)
    
    # Decode neighborhood
    neighb_train_X = tabular_enc.decode(neighbourhood)    
    neighb_train_X = convert_neighborhood_to_dataframe(neighb_train_X, ordered_feature_names)
    
    # Ensure original instance is preserved exactly
    ensure_proper_instance_preservation(neighb_train_X, original_instance_dict, ordered_feature_names)
    
    # Get predictions and encode targets
    neighb_train_y = bbox.predict(neighb_train_X)
    neighb_train_yz = tabular_enc.encode_target_class(neighb_train_y.reshape(-1, 1)).squeeze()
    
    # Get encoded feature names
    encoded_feature_names = create_encoded_feature_names(dataset)
    
    return neighbourhood, neighb_train_X, neighb_train_y, neighb_train_yz, encoded_feature_names

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
    from lore_sa.surrogate import DecisionTreeSurrogate
    
    dt = DecisionTreeSurrogate()
    return dt.train(neighbour, neighb_train_yz)
