from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pandas as pd

from lore_sa.bbox import sklearn_classifier_bbox
from lore_sa.dataset import TabularDataset

def train_model_generalized(dataset: TabularDataset, target_name:str, classifier=RandomForestClassifier(n_estimators=100, random_state=42)):
    numeric_indices = [v['index'] for k, v in dataset.descriptor['numeric'].items()]
    categorical_indices = [v['index'] for k, v in dataset.descriptor['categorical'].items()]

    # Create preprocessor using dynamic indices
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_indices),
            ('cat', OrdinalEncoder(), categorical_indices)
        ]
    )

    # Remove rare classes with fewer than 2 instances
    valid_classes = dataset.df[target_name].value_counts()[dataset.df[target_name].value_counts() > 1].index
    dataset.df = dataset.df[dataset.df[target_name].isin(valid_classes)]

        # Select features and target
    X = dataset.df.iloc[:, numeric_indices + categorical_indices]  # Select all features
    y = dataset.df[target_name]

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y,
                test_size=0.3, random_state=42, stratify=y)

    model = make_pipeline(preprocessor, classifier)
    
    model.fit(X_train, y_train)
    
    return sklearn_classifier_bbox.sklearnBBox(model)

def create_neighbourhood_with_lore(instance:pd.Series, dataset:TabularDataset, bbox:sklearn_classifier_bbox, neighbouroodSize = 100):
    from lore_sa.neighgen import RandomGenerator
    from lore_sa.encoder_decoder import ColumnTransformerEnc

    tabular_enc = ColumnTransformerEnc(dataset.descriptor)
    z = tabular_enc.encode([instance])[0] 
    gen = RandomGenerator(bbox=bbox, dataset=dataset, encoder=tabular_enc, ocr=0.1)
    neighbourood = gen.generate(z, neighbouroodSize, dataset.descriptor, tabular_enc)
    
    # decode the neighborhood to be labeled by the blackbox model
    neighb_train_X = tabular_enc.decode(neighbourood)
    neighb_train_y = bbox.predict(neighb_train_X)
    # encode the target class to the surrogate model
    neighb_train_yz = tabular_enc.encode_target_class(neighb_train_y.reshape(-1, 1)).squeeze()

    return neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz

def get_lore_decision_tree_surrogate(neighbour, neighb_train_yz):
    from lore_sa.surrogate import DecisionTreeSurrogate
    dt = DecisionTreeSurrogate()
    surrogateModel = dt.train(neighbour, neighb_train_yz)
    
    return surrogateModel
