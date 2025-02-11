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

# Update CORS middleware with specific origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Specify the exact origin
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
    feature_names = list(data.feature_names)  # Convert to list explicitly
    
    # Standardize the dataset
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Apply PCA
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    # Train decision tree on PCA data
    dt_classifier_pca = DecisionTreeClassifier(random_state=42, max_depth=3)
    dt_classifier_pca.fit(X_pca, y)
    
    # Generate decision boundary data
    x_min, x_max = X_pca[:, 0].min() - 1, X_pca[:, 0].max() + 1
    y_min, y_max = X_pca[:, 1].min() - 1, X_pca[:, 1].max() + 1
    step = 0.1
    xx, yy = np.meshgrid(np.arange(x_min, x_max, step), np.arange(y_min, y_max, step))
    
    # Get predictions for the grid
    Z = dt_classifier_pca.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    
    # Create grid points and predictions for the frontend
    grid_points = []
    for i in range(len(xx)):
        for j in range(len(xx[0])):
            grid_points.append({
                'x': float(xx[i][j]),
                'y': float(yy[i][j]),
                'class': int(Z[i][j])
            })
    
    return {
        "treeData": get_tree_data(dt_classifier_pca.tree_, ['PC1', 'PC2']),
        "pcaData": X_pca.tolist(),
        "targets": y.tolist(),
        "featureNames": feature_names,  # No need for tolist() here
        "targetNames": list(data.target_names),  # Convert to list explicitly
        "decisionBoundary": {
            "points": grid_points,
            "xRange": [float(x_min), float(x_max)],
            "yRange": [float(y_min), float(y_max)],
            "step": step
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)