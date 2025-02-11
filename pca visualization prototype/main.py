from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_tree_data(tree, feature_names):
    n_nodes = tree.node_count
    children_left = tree.children_left
    children_right = tree.children_right
    feature = tree.feature
    threshold = tree.threshold
    value = tree.value
    
    nodes = []
    for i in range(n_nodes):
        node_data = {
            "id": i,
            "feature": feature_names[feature[i]] if feature[i] != -2 else "leaf",
            "threshold": float(threshold[i]) if feature[i] != -2 else None,
            "value": value[i].tolist(),
            "left": int(children_left[i]) if children_left[i] != -1 else None,
            "right": int(children_right[i]) if children_right[i] != -1 else None
        }
        nodes.append(node_data)
    
    return nodes

@app.get("/api/tree-data")
async def get_decision_tree_data():
    # Load and prepare data
    data = load_iris()
    X = data.data
    y = data.target
    feature_names = list(data.feature_names)
    
    # Standardize the dataset
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Apply PCA
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    # Split the data and train the tree (following your original script)
    X_train_pca, X_test_pca, y_train, y_test = train_test_split(X_pca, y, test_size=0.3, random_state=42)
    dt_classifier_pca = DecisionTreeClassifier(random_state=42)  # Removed max_depth constraint
    dt_classifier_pca.fit(X_train_pca, y_train)
    
    # Generate decision boundary data with finer grid
    x_min, x_max = X_pca[:, 0].min() - 1, X_pca[:, 0].max() + 1
    y_min, y_max = X_pca[:, 1].min() - 1, X_pca[:, 1].max() + 1
    step = 0.05  # Reduced step size for finer grid
    xx, yy = np.meshgrid(np.arange(x_min, x_max, step), np.arange(y_min, y_max, step))
    
    # Get predictions for the grid
    Z = dt_classifier_pca.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    
    # Get prediction probabilities for more detailed visualization
    Z_prob = dt_classifier_pca.predict_proba(np.c_[xx.ravel(), yy.ravel()])
    Z_prob = Z_prob.reshape((xx.shape[0], xx.shape[1], -1))
    
    # Create grid points and predictions for the frontend
    grid_points = []
    for i in range(len(xx)):
        for j in range(len(xx[0])):
            grid_points.append({
                'x': float(xx[i][j]),
                'y': float(yy[i][j]),
                'class': int(Z[i][j]),
                'probabilities': [float(p) for p in Z_prob[i, j]]
            })
    
    return {
        "treeData": get_tree_data(dt_classifier_pca.tree_, ['PC1', 'PC2']),
        "pcaData": X_pca.tolist(),
        "targets": y.tolist(),
        "featureNames": feature_names,
        "targetNames": list(data.target_names),
        "decisionBoundary": {
            "points": grid_points,
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
            "step": step
        },
        "trainIndices": y_train.tolist(),  # Added to show train/test split
        "testIndices": y_test.tolist()
    }