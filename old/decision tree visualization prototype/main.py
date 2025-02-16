from dataclasses import dataclass
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json

# Sample tree data (same data as you provided)
dataFile = "loreTreeTest.json"
dataFile2 = "testTree.json"
dataFile3 = "fishingTree.json"

# Keep track of which file is currently active
current_file = dataFile

app = FastAPI()

# Allow all origins for now (or specify the frontend URL in `origins`)
origins = [
    "http://localhost:8080",  # You can add more origins if needed
    "http://192.168.1.191:8080",  # Add the IP of the client app if you access it from a device
]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows the specified origins to access the API
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

@dataclass
class TreeNode:
    """Class to store decision tree node information"""
    # Unique identifier for the node in the tree
    node_id: int
    
    # The name of the feature used for the decision at this node. 
    # If the node is a leaf, this will be `None`.
    feature_name: Optional[str]
    
    # The threshold value for the feature used to split the data at this node. 
    # If the node is a leaf, this will be `None`.
    threshold: Optional[float]
    
    # The node ID of the left child node. If the node is a leaf, this will be `None`.
    left_child: Optional[int]
    
    # The node ID of the right child node. If the node is a leaf, this will be `None`.
    right_child: Optional[int]
    
    # Indicates whether this node is a leaf node (`True` if leaf, `False` if internal).
    is_leaf: bool
    
    # The class label predicted by the leaf node. 
    # Only set if the node is a leaf; otherwise, it is `None`.
    class_label: Optional[str]
    
    # The number of samples (data points) that reached this node during training.
    samples: int

# Endpoint to get tree data
@app.get("/tree_data", response_model=List[TreeNode])
async def get_tree_data():
    global current_file
    with open(current_file, 'r') as f:
        tree_data = json.load(f)
    return tree_data

# New endpoint to switch between files
@app.post("/switch_tree")
async def switch_tree():
    global current_file
    current_file = dataFile2 if current_file == dataFile else dataFile
    return {"message": "Switched tree data", "current_file": current_file}

# Run the server if this file is executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)