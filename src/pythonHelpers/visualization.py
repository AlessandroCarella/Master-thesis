# visualization_helpers.py
import json

# File paths for visualizations
TREE_FILE = "data/loreTreeTest.json"
PCA_FILE = "data/lorePCATest.json"

def get_tree_visualization():
    """Get tree visualization data from file"""
    try:
        with open(TREE_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        return {"error": f"Error loading tree visualization: {str(e)}"}

def get_pca_visualization():
    """Get PCA visualization data from file"""
    try:
        with open(PCA_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        return {"error": f"Error loading PCA visualization: {str(e)}"}