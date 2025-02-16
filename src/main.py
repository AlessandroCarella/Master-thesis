from dataclasses import dataclass
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json

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

@dataclass
class TreeNode:
    """Class to store decision tree node information"""
    node_id: int
    feature_name: Optional[str]
    threshold: Optional[float]
    left_child: Optional[int]
    right_child: Optional[int]
    is_leaf: bool
    class_label: Optional[str]
    samples: int

# Tree visualization endpoints
@app.get("/api/get-df-features")
async def get_df_features():
    return ["test", "test"]

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)