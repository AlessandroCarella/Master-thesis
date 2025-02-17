from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pandas as pd

from lore_sa.bbox import sklearn_classifier_bbox
from lore_sa.dataset import TabularDataset
from lore_sa.neighgen import RandomGenerator
from lore_sa.encoder_decoder import ColumnTransformerEnc
from lore_sa.surrogate import DecisionTreeSurrogate

def get_feature_indices(dataset: TabularDataset):
    numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
    categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]
    return numeric_indices, categorical_indices

def create_preprocessor(numeric_indices, categorical_indices):
    return ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_indices),
            ('cat', OrdinalEncoder(), categorical_indices)
        ]
    )

def filter_rare_classes(dataset: TabularDataset, target_name: str):
    valid_classes = dataset.df[target_name].value_counts()
    valid_classes = valid_classes[valid_classes > 1].index
    dataset.df = dataset.df[dataset.df[target_name].isin(valid_classes)]

def split_dataset(dataset: TabularDataset, numeric_indices, categorical_indices, target_name: str):
    X = dataset.df.iloc[:, numeric_indices + categorical_indices]
    y = dataset.df[target_name]
    return train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

def train_model_generalized(dataset: TabularDataset, target_name: str, classifier=None):
    if classifier is None:
        classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    
    numeric_indices, categorical_indices = get_feature_indices(dataset)
    preprocessor = create_preprocessor(numeric_indices, categorical_indices)
    filter_rare_classes(dataset, target_name)
    X_train, X_test, y_train, y_test = split_dataset(dataset, numeric_indices, categorical_indices, target_name)
    
    model = make_pipeline(preprocessor, classifier)
    model.fit(X_train, y_train)
    
    return sklearn_classifier_bbox.sklearnBBox(model)

def create_neighbourhood_with_lore(instance: pd.Series, dataset: TabularDataset, bbox, neighbourhood_size=100):
    tabular_enc = ColumnTransformerEnc(dataset.descriptor)
    z = tabular_enc.encode([instance])[0]
    gen = RandomGenerator(bbox=bbox, dataset=dataset, encoder=tabular_enc, ocr=0.1)
    neighbourhood = gen.generate(z, neighbourhood_size, dataset.descriptor, tabular_enc)
    
    neighb_train_X = tabular_enc.decode(neighbourhood)
    neighb_train_y = bbox.predict(neighb_train_X)
    neighb_train_yz = tabular_enc.encode_target_class(neighb_train_y.reshape(-1, 1)).squeeze()
    
    return neighbourhood, neighb_train_X, neighb_train_y, neighb_train_yz

def get_lore_decision_tree_surrogate(neighbour, neighb_train_yz):
    dt = DecisionTreeSurrogate()
    return dt.train(neighbour, neighb_train_yz)
