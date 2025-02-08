from dataclasses import dataclass
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

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

# Sample tree data (same data as you provided)
tree_data = [
    {"node_id":0,"feature_name":"petal length (cm)","threshold":2.449999988079071,"left_child":1,"right_child":2,"is_leaf":False,"class_label":None,"samples":105},
    {"node_id":1,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"setosa","samples":31},
    {"node_id":2,"feature_name":"petal length (cm)","threshold":4.75,"left_child":3,"right_child":6,"is_leaf":False,"class_label":None,"samples":74},
    {"node_id":3,"feature_name":"petal width (cm)","threshold":1.600000023841858,"left_child":4,"right_child":5,"is_leaf":False,"class_label":None,"samples":33},
    {"node_id":4,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"versicolor","samples":32},
    {"node_id":5,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"virginica","samples":1},
    {"node_id":6,"feature_name":"petal width (cm)","threshold":1.75,"left_child":7,"right_child":14,"is_leaf":False,"class_label":None,"samples":41},
    {"node_id":7,"feature_name":"petal length (cm)","threshold":4.950000047683716,"left_child":8,"right_child":9,"is_leaf":False,"class_label":None,"samples":8},
    {"node_id":8,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"versicolor","samples":2},
    {"node_id":9,"feature_name":"petal width (cm)","threshold":1.550000011920929,"left_child":10,"right_child":11,"is_leaf":False,"class_label":None,"samples":6},
    {"node_id":10,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"virginica","samples":3},
    {"node_id":11,"feature_name":"petal length (cm)","threshold":5.450000047683716,"left_child":12,"right_child":13,"is_leaf":False,"class_label":None,"samples":3},
    {"node_id":12,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"versicolor","samples":2},
    {"node_id":13,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"virginica","samples":1},
    {"node_id":14,"feature_name":"petal length (cm)","threshold":4.8500001430511475,"left_child":15,"right_child":18,"is_leaf":False,"class_label":None,"samples":33},
    {"node_id":15,"feature_name":"sepal width (cm)","threshold":3.100000023841858,"left_child":16,"right_child":17,"is_leaf":False,"class_label":None,"samples":3},
    {"node_id":16,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"virginica","samples":2},
    {"node_id":17,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"versicolor","samples":1},
    {"node_id":18,"feature_name":None,"threshold":None,"left_child":None,"right_child":None,"is_leaf":True,"class_label":"virginica","samples":30}
]

# Endpoint to get tree data
@app.get("/tree_data", response_model=List[TreeNode])
async def get_tree_data():
    return tree_data

# Run the server if this file is executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)