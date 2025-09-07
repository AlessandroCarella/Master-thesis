from sklearn.tree import DecisionTreeClassifier
from dataclasses import dataclass
from typing import List, Optional
from dataclasses import asdict
import numpy as np

@dataclass
class TreeNode:
    """Class to store complete decision tree node information"""
    # Unique identifier for the node in the tree
    node_id: int
    
    # The name of the feature used for the decision at this node. 
    # If the node is a leaf, this will be `None`.
    feature_name: Optional[str]
    
    # The index of the feature used for the decision (original sklearn value)
    feature_index: Optional[int]
    
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
    
    # The impurity value at the node (Gini, entropy, or MSE depending on criterion)
    impurity: float
    
    # The number of samples (data points) that reached this node during training.
    n_samples: int
    
    # Weighted number of samples reaching this node
    weighted_n_samples: float
    
    # Full distribution of samples across all classes (for classification)
    # or the predicted value (for regression)
    value: np.ndarray

# ---------------- Node Information Extraction ---------------- #

def validate_feature_index(feature_index: int, feature_names: List[str]) -> None:
    """Validate that feature index is within valid range."""
    if feature_index >= len(feature_names):
        raise ValueError(f"Feature index {feature_index} out of range for feature_names of length {len(feature_names)}")

def validate_class_index(class_label_index: int, target_names: List[str]) -> None:
    """Validate that class label index is within valid range."""
    if class_label_index >= len(target_names):
        raise ValueError(f"Class label index {class_label_index} out of range for target_names of length {len(target_names)}")

def extract_leaf_node_info(tree, node_id: int, target_names: List[str]) -> tuple:
    """Extract information specific to leaf nodes."""
    class_label_index = int(tree.value[node_id].argmax())
    validate_class_index(class_label_index, target_names)
    class_label = target_names[class_label_index]
    return class_label

def extract_internal_node_info(tree, node_id: int, feature_names: List[str]) -> tuple:
    """Extract information specific to internal (non-leaf) nodes."""
    feature_index = int(tree.feature[node_id])
    validate_feature_index(feature_index, feature_names)
    
    feature_name = feature_names[feature_index]
    threshold = float(tree.threshold[node_id])
    left_child = int(tree.children_left[node_id])
    right_child = int(tree.children_right[node_id])
    
    return feature_name, feature_index, threshold, left_child, right_child

def extract_common_node_info(tree, node_id: int) -> tuple:
    """Extract information common to all node types."""
    impurity = tree.impurity[node_id]
    n_samples = int(tree.n_node_samples[node_id])
    weighted_n_samples = float(tree.weighted_n_node_samples[node_id])
    value = tree.value[node_id].copy()
    
    return impurity, n_samples, weighted_n_samples, value

def create_leaf_node(node_id: int, tree, target_names: List[str]) -> TreeNode:
    """Create a TreeNode object for a leaf node."""
    class_label = extract_leaf_node_info(tree, node_id, target_names)
    impurity, n_samples, weighted_n_samples, value = extract_common_node_info(tree, node_id)
    
    return TreeNode(
        node_id=node_id,
        feature_name=None,
        feature_index=None,
        threshold=None,
        left_child=None,
        right_child=None,
        is_leaf=True,
        class_label=class_label,
        impurity=impurity,
        n_samples=n_samples,
        weighted_n_samples=weighted_n_samples,
        value=value
    )

def create_internal_node(node_id: int, tree, feature_names: List[str]) -> TreeNode:
    """Create a TreeNode object for an internal node."""
    feature_name, feature_index, threshold, left_child, right_child = extract_internal_node_info(tree, node_id, feature_names)
    impurity, n_samples, weighted_n_samples, value = extract_common_node_info(tree, node_id)
    
    return TreeNode(
        node_id=node_id,
        feature_name=feature_name,
        feature_index=feature_index,
        threshold=threshold,
        left_child=left_child,
        right_child=right_child,
        is_leaf=False,
        class_label=None,
        impurity=impurity,
        n_samples=n_samples,
        weighted_n_samples=weighted_n_samples,
        value=value
    )

def is_leaf_node(tree, node_id: int) -> bool:
    """Check if a node is a leaf node."""
    return tree.children_left[node_id] == -1

def extract_single_node(tree, node_id: int, feature_names: List[str], target_names: List[str]) -> TreeNode:
    """Extract information for a single tree node."""
    if is_leaf_node(tree, node_id):
        return create_leaf_node(node_id, tree, target_names)
    else:
        return create_internal_node(node_id, tree, feature_names)

# ---------------- Tree Structure Extraction ---------------- #

def extract_tree_structure(tree_classifier: DecisionTreeClassifier, feature_names: List[str], target_names: List[str]) -> List[TreeNode]: 
    """Extract complete node information from a trained DecisionTreeClassifier"""
    tree = tree_classifier.dt.tree_
    nodes = []

    for node_id in range(tree.node_count):
        node = extract_single_node(tree, node_id, feature_names, target_names)
        nodes.append(node)

    return nodes

# ---------------- Node Dictionary Processing ---------------- #

def convert_numpy_arrays_to_lists(node_dict: dict) -> None:
    """Convert numpy arrays in node dictionary to lists for JSON serialization."""
    if isinstance(node_dict['value'], np.ndarray):
        node_dict['value'] = node_dict['value'].tolist()

def process_single_node_for_visualization(node: TreeNode) -> dict:
    """Process a single TreeNode for visualization."""
    node_dict = asdict(node)
    
    # Convert numpy arrays to lists for JSON serialization
    convert_numpy_arrays_to_lists(node_dict)
    
    return node_dict

# ---------------- Main Visualization Functions ---------------- #

def generate_decision_tree_visualization_data_raw(nodes):
    """Prepare tree structure for visualization. Frontend handles feature mapping using dataset descriptor."""
    nodes_dict = []
    
    for node in nodes:
        node_dict = process_single_node_for_visualization(node)
        nodes_dict.append(node_dict)
    
    return nodes_dict
