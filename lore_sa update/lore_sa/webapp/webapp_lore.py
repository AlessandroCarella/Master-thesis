from typing import Dict, List, Tuple, Any, Union, Optional
import pandas as pd
import numpy as np
import logging
import os
import joblib
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
import copy

from .routes.webapp_api_state import webapp_state

target_name = 'target'


class DatasetProcessor:
    """
    Processes datasets for machine learning model training.
    
    Handles feature type identification, preprocessing pipeline creation,
    and data preparation for training workflows.
    
    Parameters
    ----------
    dataset : Any
        Dataset object containing descriptor information and data.
        
    Attributes
    ----------
    dataset : Any
        The dataset being processed.
    numeric_indices : List[int]
        Column indices for numeric features.
    categorical_indices : List[int]
        Column indices for categorical features.
    """
    
    def __init__(self, dataset: Any) -> None:
        """Initialize processor with dataset and extract feature indices."""
        self.dataset = dataset
        self.numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
        self.categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]

    def get_ordered_feature_names(self) -> List[str]:
        """
        Extract feature names ordered by their dataset indices.
        
        Returns
        -------
        List[str]
            Feature names sorted by their original column indices.
        """
        features = []
        for name, info in self.dataset.descriptor['numeric'].items():
            features.append((info['index'], name))
        for name, info in self.dataset.descriptor['categorical'].items():
            features.append((info['index'], name))
        features.sort(key=lambda x: x[0])
        return [name for _, name in features]
    
    def create_preprocessor(self) -> ColumnTransformer:
        """
        Create sklearn preprocessing pipeline for mixed data types.
        
        Returns
        -------
        ColumnTransformer
            Preprocessing pipeline with standard scaling for numeric features
            and ordinal encoding for categorical features.
        """
        return ColumnTransformer([
            ('num', StandardScaler(), self.numeric_indices),
            ('cat', OrdinalEncoder(), self.categorical_indices)
        ])
    
    def prepare_for_training(self) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare dataset for model training by filtering and splitting.
        
        Returns
        -------
        Tuple[pd.DataFrame, pd.Series]
            Feature DataFrame and target Series ready for training.
            
        Notes
        -----
        Filters out classes with single instances to prevent training issues.
        Selects features based on numeric and categorical indices.
        """
        class_counts = self.dataset.df[target_name].value_counts()
        valid_classes = class_counts[class_counts > 1].index
        self.dataset.df = self.dataset.df[self.dataset.df[target_name].isin(valid_classes)]
        
        feature_indices = self.numeric_indices + self.categorical_indices
        X = self.dataset.df.iloc[:, feature_indices]
        y = self.dataset.df[target_name]
        
        return X, y


class ModelTrainer:
    """
    Handles model training with caching support for performance optimization.
    
    Manages training workflows, cache storage/retrieval, and state updates
    for machine learning models in the webapp environment.
    
    Parameters
    ----------
    cache_dir : str, default='webapp cache'
        Directory path for storing cached model artifacts.
        
    Attributes
    ----------
    cache_dir : str
        Path to cache directory.
    """
    
    def __init__(self, cache_dir: str = 'webapp cache') -> None:
        """Initialize trainer with cache directory setup."""
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_path(self, dataset_name: str, classifier_name: str, params_hash: str) -> str:
        """
        Generate cache file path for model artifacts.
        
        Parameters
        ----------
        dataset_name : str
            Name of the dataset used.
        classifier_name : str
            Name of the classifier type.
        params_hash : str
            Hash of classifier parameters.
            
        Returns
        -------
        str
            Full path to cache file.
        """
        return os.path.join(
            self.cache_dir, 
            f'classifier_{dataset_name}_target_{classifier_name}_{params_hash}.pkl'
        )
    
    def train_or_load_model(self, dataset_name: str, classifier: Any = None) -> Tuple[Any, Any, List[str]]:
        """
        Train new model or load from cache if available.
        
        Parameters
        ----------
        dataset_name : str
            Name of dataset to train on.
        classifier : Any
            Sklearn classifier instance to train.
            
        Returns
        -------
        Tuple[Any, Any, List[str]]
            Trained model bbox, dataset object, and feature names.
        """
        params_hash = joblib.hash(classifier.get_params())
        cache_path = self._get_cache_path(dataset_name, classifier.__class__.__name__, params_hash)
        
        if os.path.exists(cache_path):
            return self._load_from_cache(cache_path)
        
        return self._train_and_cache(dataset_name, classifier, cache_path)
    
    def _load_from_cache(self, cache_path: str) -> Tuple[Any, Any, List[str]]:
        """
        Load model artifacts from cache file.
        
        Parameters
        ----------
        cache_path : str
            Path to cached model file.
            
        Returns
        -------
        Tuple[Any, Any, List[str]]
            Cached model bbox, dataset, and feature names.
        """
        cached_data = joblib.load(cache_path)
        bbox, X, y, dataset, feature_names = cached_data
        logging.info(f"Loaded model from webapp cache: {cache_path}")
        self._update_webapp_state(X, y)
        return bbox, dataset, feature_names
    
    def _train_and_cache(self, dataset_name: str, classifier: Any, cache_path: str) -> Tuple[Any, Any, List[str]]:
        """
        Train new model and cache the results.
        
        Parameters
        ----------
        dataset_name : str
            Name of dataset for training.
        classifier : Any
            Sklearn classifier to train.
        cache_path : str
            Path where cache should be stored.
            
        Returns
        -------
        Tuple[Any, Any, List[str]]
            Trained model bbox, dataset object, and feature names.
        """
        X, y, feature_names, target_names = self._load_raw_dataset(dataset_name)
        data_dict = self._create_data_dict(X, y, feature_names, target_names)
        dataset = self._create_tabular_dataset(data_dict)
        
        bbox, X, y = self._train_model(dataset, classifier)
        
        cache_data = (bbox, X, y, dataset, feature_names)
        joblib.dump(cache_data, cache_path)
        logging.info(f"Cached model to: {cache_path}")
        
        self._update_webapp_state(X, y)
        return bbox, dataset, feature_names
    
    def _load_raw_dataset(self, dataset_name: str) -> Tuple[Any, np.ndarray, List[str], List[str]]:
        """
        Load raw dataset from webapp datasets module.
        
        Parameters
        ----------
        dataset_name : str
            Name of dataset to load.
            
        Returns
        -------
        Tuple[Any, np.ndarray, List[str], List[str]]
            Raw dataset data, target array, feature names, and target names.
        """
        from .webapp_datasets import load_dataset
        raw_dataset, feature_names, target_names = load_dataset(dataset_name)
        return raw_dataset.data, raw_dataset.target, feature_names, target_names
    
    def _create_data_dict(self, X: Any, y: np.ndarray, feature_names: List[str], 
                         target_names: List[str]) -> Dict[str, Any]:
        """
        Convert raw data to dictionary format for dataset creation.
        
        Parameters
        ----------
        X : Any
            Feature data (DataFrame or array).
        y : np.ndarray
            Target labels.
        feature_names : List[str]
            Names of features.
        target_names : List[str]
            Names of target classes.
            
        Returns
        -------
        Dict[str, Any]
            Dictionary with feature columns and target labels.
        """
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
    
    def _create_tabular_dataset(self, data_dict: Dict[str, Any]) -> Any:
        """
        Create TabularDataset object from data dictionary.
        
        Parameters
        ----------
        data_dict : Dict[str, Any]
            Dictionary containing feature and target data.
            
        Returns
        -------
        Any
            TabularDataset object with cleaned data.
        """
        from lore_sa.dataset import TabularDataset
        dataset = TabularDataset.from_dict(data_dict, 'target')
        dataset.df.dropna(inplace=True)
        return dataset
    
    def _train_model(self, dataset: Any, classifier: Any) -> Tuple[Any, pd.DataFrame, pd.Series]:
        """
        Train classifier on processed dataset.
        
        Parameters
        ----------
        dataset : Any
            Preprocessed TabularDataset.
        classifier : Any
            Sklearn classifier to train.
            
        Returns
        -------
        Tuple[Any, pd.DataFrame, pd.Series]
            Black box wrapper, training features, and training targets.
        """
        from lore_sa.bbox import sklearn_classifier_bbox
        
        processor = DatasetProcessor(dataset)
        preprocessor = processor.create_preprocessor()
        model = make_pipeline(preprocessor, classifier)
        
        X, y = processor.prepare_for_training()
        model.fit(X, y)
        
        return sklearn_classifier_bbox.sklearnBBox(model), X, y
    
    def _update_webapp_state(self, X: pd.DataFrame, y: pd.Series) -> None:
        """
        Update global webapp state with training data.
        
        Parameters
        ----------
        X : pd.DataFrame
            Training feature data.
        y : pd.Series
            Training target data.
        """
        webapp_state.X = X
        webapp_state.y = y


class NeighborhoodGenerator:
    """
    Generates neighborhood samples for local explanation using LORE methodology.
    
    Creates synthetic samples around a target instance to train local
    surrogate models for interpretable explanations.
    
    Parameters
    ----------
    dataset : Any
        Dataset object with descriptor information.
    bbox : Any
        Black box model for generating predictions.
        
    Attributes
    ----------
    dataset : Any
        Dataset being used for context.
    bbox : Any
        Black box model wrapper.
    processor : DatasetProcessor
        Processor for dataset operations.
    feature_names : List[str]
        Ordered list of feature names.
    """
    
    def __init__(self, dataset: Any, bbox: Any) -> None:
        """Initialize generator with dataset and model context."""
        self.dataset = dataset
        self.bbox = bbox
        self.processor = DatasetProcessor(dataset)
        self.feature_names = self.processor.get_ordered_feature_names()

    def generate_neighborhood(self, instance: Union[Dict[str, Any], pd.Series], keepDuplicates: bool, 
                            neighborhood_size: int) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame, np.ndarray, List[str]]:
        """
        Generate neighborhood samples around target instance.
        
        Parameters
        ----------
        instance : Union[Dict[str, Any], pd.Series]
            Target instance to explain.
        keepDuplicates : bool
            Whether to retain duplicate samples in neighborhood.
        neighborhood_size : int
            Number of neighborhood samples to generate.
            
        Returns
        -------
        Tuple[np.ndarray, np.ndarray, pd.DataFrame, np.ndarray, List[str]]
            Encoded neighborhood, encoded predictions, decoded neighborhood,
            raw predictions, and encoded feature names.
        """
        instance_df = self._prepare_instance(instance)
        encoded_instance = webapp_state.encoder.encode(instance_df)
        encoded_instance = encoded_instance[0]

        if webapp_state.generator is None:
            from ..neighgen.genetic import GeneticGenerator
            webapp_state.generator = GeneticGenerator(webapp_state.bbox, webapp_state.dataset, webapp_state.encoder, 0.1)
        
        neighborhood = webapp_state.generator.generate(copy.deepcopy(encoded_instance), neighborhood_size, 
                                        self.dataset.descriptor, webapp_state.encoder)
        
        if not keepDuplicates:
            neighborhood = self._remove_duplicates(neighborhood)
        neighborhood = self._ensure_instance_at_end(copy.deepcopy(encoded_instance), neighborhood)
        decoded_neighborhood = webapp_state.encoder.decode(neighborhood)
        decoded_neighborhood = self._to_dataframe(decoded_neighborhood)

        predictions = self.bbox.predict(decoded_neighborhood)
        encoded_predictions = webapp_state.encoder.encode_target_class(predictions.reshape(-1, 1)).squeeze()
        
        return (neighborhood, encoded_predictions, 
                decoded_neighborhood, predictions, 
                self._get_encoded_feature_names())
    
    def _prepare_instance(self, instance: Union[Dict[str, Any], pd.Series, pd.DataFrame]) -> pd.DataFrame:
        """
        Convert instance to properly formatted DataFrame.
        
        Parameters
        ----------
        instance : Union[Dict[str, Any], pd.Series, pd.DataFrame]
            Instance in various possible formats.
            
        Returns
        -------
        pd.DataFrame
            Standardized DataFrame with correct feature order and types.
        """
        if isinstance(instance, pd.Series):
            instance_dict = instance.to_dict()
            instance_df = pd.DataFrame([{f: instance_dict[f] for f in self.feature_names}])
        elif isinstance(instance, dict):
            instance_df = pd.DataFrame([{f: instance[f] for f in self.feature_names}])
        else:
            instance_df = instance[self.feature_names].copy() if hasattr(instance, 'columns') else instance
        
        for col in instance_df.columns:
            if col in self.dataset.df.columns:
                instance_df[col] = instance_df[col].astype(self.dataset.df[col].dtype)
        
        return instance_df
    
    def _remove_duplicates(self, neighborhood: np.ndarray) -> np.ndarray:
        """
        Remove duplicate rows from neighborhood array.
        
        Parameters
        ----------
        neighborhood : np.ndarray
            Neighborhood samples potentially containing duplicates.
            
        Returns
        -------
        np.ndarray
            Neighborhood with duplicate rows removed.
        """
        unique_rows = []
        seen = set()
        for row in neighborhood:
            row_tuple = tuple(row)
            if row_tuple not in seen:
                unique_rows.append(row)
                seen.add(row_tuple)
        return np.array(unique_rows, dtype=neighborhood.dtype)
    
    def _ensure_instance_at_end(self, instance: np.ndarray, neighborhood: np.ndarray) -> np.ndarray:
        """
        Add original instance at end of neighborhood for reference.
        
        Parameters
        ----------
        instance : np.ndarray
            Original encoded instance.
        neighborhood : np.ndarray
            Generated neighborhood samples.
            
        Returns
        -------
        np.ndarray
            Neighborhood with original instance appended.
        """
        instance = np.array(instance) if not isinstance(instance, np.ndarray) else instance
        neighborhood = np.array(neighborhood) if not isinstance(neighborhood, np.ndarray) else neighborhood
        
        return np.vstack([neighborhood, instance.reshape(1, -1)])
    
    def _to_dataframe(self, data: np.ndarray) -> pd.DataFrame:
        """
        Convert numpy array to DataFrame with feature names.
        
        Parameters
        ----------
        data : np.ndarray
            Array data to convert.
            
        Returns
        -------
        pd.DataFrame
            DataFrame with proper column names.
        """
        return pd.DataFrame(data, columns=self.feature_names) if isinstance(data, np.ndarray) else data

    def _get_encoded_feature_names(self) -> List[str]:
        """
        Generate encoded feature names for transformed features.
        
        Returns
        -------
        List[str]
            Names of features after encoding transformations.
            
        Notes
        -----
        Numeric features keep original names, categorical features
        are expanded with one-hot encoding naming convention.
        """
        names = []
        
        for name, info in sorted(self.dataset.descriptor['numeric'].items(), 
                            key=lambda x: x[1]['index']):
            names.append(name)
        
        for name, info in sorted(self.dataset.descriptor['categorical'].items(), 
                            key=lambda x: x[1]['index']):
            for value in sorted(info['distinct_values']):
                names.append(f"{name}_{value}")
        
        return names


def load_cached_classifier(dataset_name: str, classifier: Any = None, 
                         classifier_name: str = None) -> Tuple[Any, Any, List[str]]:
    """
    Load cached classifier or train and cache new one.
    
    Parameters
    ----------
    dataset_name : str
        Name of dataset to use.
    classifier : Any
        Sklearn classifier instance.
    classifier_name : str
        Name of classifier type (for logging).
        
    Returns
    -------
    Tuple[Any, Any, List[str]]
        Trained model, dataset object, and feature names.
    """
    trainer = ModelTrainer()
    return trainer.train_or_load_model(dataset_name, classifier)


def create_neighbourhood_with_lore(instance: Union[Dict[str, Any], pd.Series], bbox: Any, 
                                 dataset: Any, keepDuplicates: bool, 
                                 neighbourhood_size: int) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame, np.ndarray, List[str]]:
    """
    Create neighborhood samples using LORE methodology for local explanations.
    
    Parameters
    ----------
    instance : Union[Dict[str, Any], pd.Series]
        Instance to generate neighborhood around.
    bbox : Any
        Black box model for predictions.
    dataset : Any
        Dataset context for generation.
    keepDuplicates : bool
        Whether to keep duplicate samples.
    neighbourhood_size : int
        Number of samples to generate.
        
    Returns
    -------
    Tuple[np.ndarray, np.ndarray, pd.DataFrame, np.ndarray, List[str]]
        Generated neighborhood data and metadata.
    """
    generator = NeighborhoodGenerator(dataset, bbox)
    return generator.generate_neighborhood(instance, keepDuplicates, neighbourhood_size)


def train_surrogate(neighbour: np.ndarray, encoded_predictions: np.ndarray) -> None:
    """
    Train surrogate model on neighborhood data.
    
    Parameters
    ----------
    neighbour : np.ndarray
        Neighborhood feature samples.
    encoded_predictions : np.ndarray
        Encoded predictions for neighborhood.
        
    Notes
    -----
    Updates webapp_state.surrogate with trained model.
    """
    webapp_state.surrogate.train(neighbour, encoded_predictions)
    