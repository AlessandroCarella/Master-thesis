import pandas as pd
import numpy as np
import logging
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer

from .routes.state import global_state

target_name = 'target'

# ---------------- Core Dataset Processing ---------------- #

class DatasetProcessor:
    """Handles dataset preprocessing and preparation for LORE."""
    
    def __init__(self, dataset):
        self.dataset = dataset
        self.numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
        self.categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]

    def get_ordered_feature_names(self):
        """Get feature names ordered by descriptor indices."""
        features = []
        for name, info in self.dataset.descriptor['numeric'].items():
            features.append((info['index'], name))
        for name, info in self.dataset.descriptor['categorical'].items():
            features.append((info['index'], name))
        features.sort(key=lambda x: x[0])
        return [name for _, name in features]
    
    def create_preprocessor(self):
        """Create sklearn preprocessor for numeric and categorical features."""
        return ColumnTransformer([
            ('num', StandardScaler(), self.numeric_indices),
            ('cat', OrdinalEncoder(), self.categorical_indices)
        ])
    
    def prepare_for_training(self):
        """Prepare dataset for model training with stratified split."""
        # Filter rare classes
        class_counts = self.dataset.df[target_name].value_counts()
        valid_classes = class_counts[class_counts > 1].index
        self.dataset.df = self.dataset.df[self.dataset.df[target_name].isin(valid_classes)]
        
        # Split features and target
        # feature_indices = sorted(self.numeric_indices + self.categorical_indices)
        feature_indices = self.numeric_indices + self.categorical_indices
        X = self.dataset.df.iloc[:, feature_indices]
        y = self.dataset.df[target_name]
        
        return train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)


# ---------------- Model Training and Caching ---------------- #

class ModelTrainer:
    """Handles model training with caching support."""
    
    def __init__(self, cache_dir='cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_path(self, dataset_name, classifier_name, params_hash):
        """Generate cache file path."""
        return os.path.join(
            self.cache_dir, 
            f'classifier_{dataset_name}_target_{classifier_name}_{params_hash}.pkl'
        )
    
    def train_or_load_model(self, dataset_name, classifier=None):
        """Train model or load from cache."""        
        # Check cache
        params_hash = joblib.hash(classifier.get_params())
        cache_path = self._get_cache_path(dataset_name, classifier.__class__.__name__, params_hash)
        
        if os.path.exists(cache_path):
            return self._load_from_cache(cache_path)
        
        return self._train_and_cache(dataset_name, classifier, cache_path)
    
    def _load_from_cache(self, cache_path):
        """Load model and data from cache."""
        cached_data = joblib.load(cache_path)
        bbox, X_train, X_test, y_train, y_test, dataset, feature_names = cached_data
        logging.info(f"Loaded model from cache: {cache_path}")
        self._update_global_state(X_train, y_train, X_test, y_test)
        return bbox, dataset, feature_names
    
    def _train_and_cache(self, dataset_name, classifier, cache_path):
        """Train new model and cache results."""
        # Load and prepare dataset
        X, y, feature_names, target_names = self._load_raw_dataset(dataset_name)
        data_dict = self._create_data_dict(X, y, feature_names, target_names)
        dataset = self._create_tabular_dataset(data_dict)
        
        # Train model
        bbox, X_train, X_test, y_train, y_test = self._train_model(dataset, classifier)
        
        # Cache results
        cache_data = (bbox, X_train, X_test, y_train, y_test, dataset, feature_names)
        joblib.dump(cache_data, cache_path)
        logging.info(f"Cached model to: {cache_path}")
        
        self._update_global_state(X_train, y_train, X_test, y_test)
        return bbox, dataset, feature_names
    
    def _load_raw_dataset(self, dataset_name):
        """Load raw dataset from datasets module."""
        from .datasets import load_dataset
        raw_dataset, feature_names, target_names = load_dataset(dataset_name)
        return raw_dataset.data, raw_dataset.target, feature_names, target_names
    
    def _create_data_dict(self, X, y, feature_names, target_names):
        """Create data dictionary for TabularDataset."""
        data_dict = {}
        
        if isinstance(X, pd.DataFrame):
            for name in feature_names:
                series = X[name]
                data_dict[name] = series.astype(float).values if pd.api.types.is_numeric_dtype(series) else series.astype(str).values
        else:
            X_array = X.to_numpy() if not isinstance(X, np.ndarray) else X
            data_dict = {name: X_array[:, i] for i, name in enumerate(feature_names)}
        
        data_dict['target'] = [target_names[i] for i in y]
        return data_dict
    
    def _create_tabular_dataset(self, data_dict):
        """Create and clean TabularDataset."""
        from lore_sa.dataset import TabularDataset
        dataset = TabularDataset.from_dict(data_dict, 'target')
        dataset.df.dropna(inplace=True)
        return dataset
    
    def _train_model(self, dataset, classifier):
        """Train model using dataset processor."""
        from lore_sa.bbox import sklearn_classifier_bbox
        
        processor = DatasetProcessor(dataset)
        preprocessor = processor.create_preprocessor()
        model = make_pipeline(preprocessor, classifier)
        
        X_train, X_test, y_train, y_test = processor.prepare_for_training()
        model.fit(X_train, y_train)
        
        return sklearn_classifier_bbox.sklearnBBox(model), X_train, X_test, y_train, y_test
    
    def _update_global_state(self, X_train, y_train, X_test, y_test):
        """Update global state with training data."""
        global_state.X_train = X_train
        global_state.y_train = y_train
        global_state.X_test = X_test
        global_state.y_test = y_test


# ---------------- Neighborhood Generation ---------------- #

class NeighborhoodGenerator:
    """Handles LORE neighborhood generation and processing."""
    
    def __init__(self, dataset, bbox):
        self.dataset = dataset
        self.bbox = bbox
        self.processor = DatasetProcessor(dataset)
        self.feature_names = self.processor.get_ordered_feature_names()

    def generate_neighborhood(self, instance, keepDuplicates, neighborhood_size):
        """Generate neighborhood around instance using LORE."""
        from lore_sa.encoder_decoder import ColumnTransformerEnc
        from lore_sa.neighgen import GeneticGenerator
        
        # Initialize encoder
        encoder = ColumnTransformerEnc(self.dataset.descriptor)

        # Prepare instance
        instance_df = self._prepare_instance(instance)
        original_dict = instance_df.iloc[0].to_dict()
        
        # Encode and generate neighborhood
        encoded_instance = encoder.encode(instance_df)[0]

        generator = GeneticGenerator(self.bbox, self.dataset, encoder)
        neighborhood = generator.generate(encoded_instance, neighborhood_size, 
                                        self.dataset.descriptor, encoder)
        
        # Process neighborhood
        if not keepDuplicates:
            neighborhood = self._remove_duplicates(neighborhood)
        neighborhood = self._ensure_instance_at_end(encoded_instance, neighborhood)
        
        # Decode and get predictions
        decoded_neighborhood = encoder.decode(neighborhood)  # neighborhood should already be numpy array
        decoded_neighborhood = self._to_dataframe(decoded_neighborhood)
        print(decoded_neighborhood.iloc[-1])
        # decoded_neighborhood = self._preserve_original_instance(decoded_neighborhood, original_dict)

        predictions = self.bbox.predict(decoded_neighborhood)
        encoded_predictions = encoder.encode_target_class(predictions.reshape(-1, 1)).squeeze()
        
        return (neighborhood, decoded_neighborhood, predictions, 
                encoded_predictions, self._get_encoded_feature_names())
    
    def _prepare_instance(self, instance):
        """Convert instance to properly ordered DataFrame."""
        if isinstance(instance, pd.Series):
            instance_dict = instance.to_dict()
            instance_df = pd.DataFrame([{f: instance_dict[f] for f in self.feature_names}])
        elif isinstance(instance, dict):
            instance_df = pd.DataFrame([{f: instance[f] for f in self.feature_names}])
        else:
            instance_df = instance[self.feature_names].copy() if hasattr(instance, 'columns') else instance
        
        # Ensure data types match the dataset
        for col in instance_df.columns:
            if col in self.dataset.df.columns:
                instance_df[col] = instance_df[col].astype(self.dataset.df[col].dtype)
        
        return instance_df
    
    def _remove_duplicates(self, neighborhood):
        """Remove duplicate rows from neighborhood."""
        unique_rows = []
        seen = set()
        for row in neighborhood:
            row_tuple = tuple(row)
            if row_tuple not in seen:
                unique_rows.append(row)
                seen.add(row_tuple)
        return np.array(unique_rows, dtype=neighborhood.dtype)
    
    def _ensure_instance_at_end(self, instance, neighborhood):
        """Ensure instance is at the end of neighborhood with exact matching."""
        # Convert to numpy arrays if needed
        instance = np.array(instance) if not isinstance(instance, np.ndarray) else instance
        neighborhood = np.array(neighborhood) if not isinstance(neighborhood, np.ndarray) else neighborhood
        
        # Add the exact instance at the end
        return np.vstack([neighborhood, instance.reshape(1, -1)])
    
    def _to_dataframe(self, data):
        """Convert array to DataFrame with proper column names."""
        return pd.DataFrame(data, columns=self.feature_names) if isinstance(data, np.ndarray) else data
    
    def _preserve_original_instance(self, neighborhood_df, original_dict):
        """Add the original instance to the end of the neighborhood."""
        # Convert original_dict to a DataFrame row
        original_row = pd.DataFrame([original_dict])
        
        # Ensure the row has the same columns in the same order as neighborhood_df
        original_row = original_row.reindex(columns=neighborhood_df.columns)
        
        # Append the original instance to the end of the neighborhood
        updated_neighborhood = pd.concat([neighborhood_df, original_row], ignore_index=True)

        return updated_neighborhood

    def _get_encoded_feature_names(self):
        """Create encoded feature names for one-hot encoded categoricals."""
        names = []
        
        # Numeric features keep original names (sorted by index)
        for name, info in sorted(self.dataset.descriptor['numeric'].items(), 
                            key=lambda x: x[1]['index']):
            names.append(name)
        
        # Categorical features get expanded names (sorted by index, then alphabetical categories)
        for name, info in sorted(self.dataset.descriptor['categorical'].items(), 
                            key=lambda x: x[1]['index']):
            # Sort categories alphabetically to match sklearn's OneHotEncoder behavior
            for value in sorted(info['distinct_values']):
                names.append(f"{name}_{value}")
        
        return names

# ---------------- Decision Tree Surrogate ---------------- #

def create_decision_tree_surrogate(encoded_neighborhood, encoded_predictions):
    """Create decision tree surrogate model."""
    from lore_sa.surrogate import DecisionTreeSurrogate
    surrogate = DecisionTreeSurrogate()
    return surrogate.train(encoded_neighborhood, encoded_predictions)


# ---------------- Main Interface Functions ---------------- #

def load_cached_classifier(dataset_name, classifier=None, classifier_name=None):
    """Main interface for loading/training classifiers with caching."""
    trainer = ModelTrainer()
    return trainer.train_or_load_model(dataset_name, classifier)

def create_neighbourhood_with_lore(instance, bbox, dataset, keepDuplicates, neighbourhood_size):
    """Main interface for neighborhood generation."""
    generator = NeighborhoodGenerator(dataset, bbox)
    return generator.generate_neighborhood(instance, keepDuplicates, neighbourhood_size)

def get_lore_decision_tree_surrogate(neighbour, neighb_train_yz):
    """Main interface for creating decision tree surrogate."""
    return create_decision_tree_surrogate(neighbour, neighb_train_yz)
