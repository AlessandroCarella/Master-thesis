from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

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