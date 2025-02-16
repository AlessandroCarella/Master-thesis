from dataclasses import dataclass
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import numpy as np
import pandas as pd

from pythonHelpers.generate_decision_tree_visualization_data import TreeNode

# Keep track of which files are currently active
current_tree_file = "data/loreTreeTest.json"
current_pca_file = "data/lorePCATest.json"

app = FastAPI()

# Allow specified origins
origins = [
    "http://localhost:8080",
    "http://192.168.1.191:8080",
]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tree visualization endpoints
@app.get("/api/tree_data", response_model=List[TreeNode])
async def get_tree_data():
    """Get current tree visualization data"""
    with open(current_tree_file, 'r') as f:
        tree_data = json.load(f)
    return tree_data

# PCA visualization endpoints
@app.get("/api/pca-data")
async def get_pca_data():
    """Get current PCA visualization data"""
    with open(current_pca_file) as f:
        return json.load(f)

# New endpoint to return a mock dataset
@app.get("/api/get-dataset")
async def get_mock_dataset():
    # Create mock dataset
    def create_mock_dataset(n_rows=100):
        np.random.seed(42)
        data = {
            "age": np.random.randint(18, 70, n_rows),
            "income": np.random.randint(30000, 150000, n_rows),
            "education_years": np.random.randint(12, 22, n_rows),
            "occupation": np.random.choice(["Engineer", "Teacher", "Doctor", "Sales", "Other"], n_rows),
            "credit_score": np.random.randint(300, 850, n_rows),
            "debt_ratio": np.random.uniform(0, 1, n_rows),
            "employment_length": np.random.randint(0, 30, n_rows),
            "loan_amount": np.random.randint(5000, 50000, n_rows),
            "loan_term": np.random.choice([12, 24, 36, 48, 60], n_rows)
        }
        return pd.DataFrame(data)

    """Get a mock dataset"""
    return {"dataset": create_mock_dataset().head(50).to_dict('records')}

@app.get("/api/get-df-features")
async def get_df_features():
    return ["Feature 1", "Feature 2", "Feature 3"]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)