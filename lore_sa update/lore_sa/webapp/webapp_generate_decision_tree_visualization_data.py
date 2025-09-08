from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
import numpy as np
from sklearn.tree import DecisionTreeClassifier


@dataclass
class TreeNode:
    """
    Structured representation of a decision tree node.
    
    Attributes
    ----------
    node_id : int
        Unique identifier for the node in the tree.
    feature_name : str
        Name of the feature used for decision at this node.
        None for leaf nodes.
    feature_index : int
        Index of the feature used for the decision.
        None for leaf nodes.
    threshold : float
        Threshold value for feature-based splitting.
        None for leaf nodes.
    left_child : int
        Node ID of the left child node.
        None for leaf nodes.
    right_child : int
        Node ID of the right child node.
        None for leaf nodes.
    is_leaf : bool
        Indicates whether this node is a leaf (True) or internal (False).
    class_label : str
        Predicted class label for leaf nodes.
        None for internal nodes.
    impurity : float
        Impurity value at the node (Gini, entropy, or MSE).
    n_samples : int
        Number of samples that reached this node during training.
    weighted_n_samples : float
        Weighted number of samples reaching this node.
    value : np.ndarray
        Sample distribution across classes (classification) or predicted value (regression).
    """
    
    node_id: int
    feature_name: str
    feature_index: int
    threshold: float
    left_child: int
    right_child: int
    is_leaf: bool
    class_label: str
    impurity: float
    n_samples: int
    weighted_n_samples: float
    value: np.ndarray


def validate_feature_index(feature_index: int, feature_names: List[str]) -> None:
    """
    Validate that feature index is within bounds of feature names.
    
    Parameters
    ----------
    feature_index : int
        Index to validate.
    feature_names : List[str]
        List of available feature names.
        
    Raises
    ------
    ValueError
        If feature index is out of range.
    """
    if feature_index >= len(feature_names):
        raise ValueError(f"Feature index {feature_index} out of range for feature_names of length {len(feature_names)}")


def validate_class_index(class_label_index: int, target_names: List[str]) -> None:
    """
    Validate that class label index is within bounds of target names.
    
    Parameters
    ----------
    class_label_index : int
        Index to validate.
    target_names : List[str]
        List of available target names.
        
    Raises
    ------
    ValueError
        If class label index is out of range.
    """
    if class_label_index >= len(target_names):
        raise ValueError(f"Class label index {class_label_index} out of range for target_names of length {len(target_names)}")


def extract_leaf_node_info(tree: Any, node_id: int, target_names: List[str]) -> str:
    """
    Extract class label information from a leaf node.
    
    Parameters
    ----------
    tree : Any
        Sklearn decision tree structure.
    node_id : int
        ID of the leaf node.
    target_names : List[str]
        Names of the target classes.
        
    Returns
    -------
    str
        Class label name for the leaf node prediction.
    """
    class_label_index = int(tree.value[node_id].argmax())
    validate_class_index(class_label_index, target_names)
    class_label = target_names[class_label_index]
    return class_label


def extract_internal_node_info(tree: Any, node_id: int, feature_names: List[str]) -> Tuple[str, int, float, int, int]:
    """
    Extract decision information from an internal tree node.
    
    Parameters
    ----------
    tree : Any
        Sklearn decision tree structure.
    node_id : int
        ID of the internal node.
    feature_names : List[str]
        Names of the features.
        
    Returns
    -------
    Tuple[str, int, float, int, int]
        Feature name, feature index, threshold, left child ID, right child ID.
    """
    feature_index = int(tree.feature[node_id])
    validate_feature_index(feature_index, feature_names)
    
    feature_name = feature_names[feature_index]
    threshold = float(tree.threshold[node_id])
    left_child = int(tree.children_left[node_id])
    right_child = int(tree.children_right[node_id])
    
    return feature_name, feature_index, threshold, left_child, right_child


def extract_common_node_info(tree: Any, node_id: int) -> Tuple[float, int, float, np.ndarray]:
    """
    Extract common information present in both leaf and internal nodes.
    
    Parameters
    ----------
    tree : Any
        Sklearn decision tree structure.
    node_id : int
        ID of the node.
        
    Returns
    -------
    Tuple[float, int, float, np.ndarray]
        Impurity, sample count, weighted sample count, and value array.
    """
    impurity = tree.impurity[node_id]
    n_samples = int(tree.n_node_samples[node_id])
    weighted_n_samples = float(tree.weighted_n_node_samples[node_id])
    value = tree.value[node_id].copy()
    
    return impurity, n_samples, weighted_n_samples, value


def create_leaf_node(node_id: int, tree: Any, target_names: List[str]) -> TreeNode:
    """
    Create TreeNode object for a leaf node.
    
    Parameters
    ----------
    node_id : int
        ID of the leaf node.
    tree : Any
        Sklearn decision tree structure.
    target_names : List[str]
        Names of the target classes.
        
    Returns
    -------
    TreeNode
        Structured representation of the leaf node.
    """
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


def create_internal_node(node_id: int, tree: Any, feature_names: List[str]) -> TreeNode:
    """
    Create TreeNode object for an internal node.
    
    Parameters
    ----------
    node_id : int
        ID of the internal node.
    tree : Any
        Sklearn decision tree structure.
    feature_names : List[str]
        Names of the features.
        
    Returns
    -------
    TreeNode
        Structured representation of the internal node.
    """
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


def is_leaf_node(tree: Any, node_id: int) -> bool:
    """
    Check if a node is a leaf node.
    
    Parameters
    ----------
    tree : Any
        Sklearn decision tree structure.
    node_id : int
        ID of the node to check.
        
    Returns
    -------
    bool
        True if the node is a leaf, False otherwise.
        
    Notes
    -----
    In sklearn decision trees, leaf nodes have children_left[node_id] == -1.
    """
    return tree.children_left[node_id] == -1


def extract_single_node(tree: Any, node_id: int, feature_names: List[str], target_names: List[str]) -> TreeNode:
    """
    Extract structured information for a single tree node.
    
    Parameters
    ----------
    tree : Any
        Sklearn decision tree structure.
    node_id : int
        ID of the node to extract.
    feature_names : List[str]
        Names of the features.
    target_names : List[str]
        Names of the target classes.
        
    Returns
    -------
    TreeNode
        Structured representation of the node.
    """
    if is_leaf_node(tree, node_id):
        return create_leaf_node(node_id, tree, target_names)
    else:
        return create_internal_node(node_id, tree, feature_names)


def extract_tree_structure(tree_classifier: DecisionTreeClassifier, feature_names: List[str], 
                         target_names: List[str]) -> List[TreeNode]:
    """
    Extract complete tree structure from sklearn DecisionTreeClassifier.
    
    Parameters
    ----------
    tree_classifier : DecisionTreeClassifier
        Trained sklearn decision tree classifier.
    feature_names : List[str]
        Names of the features used in the tree.
    target_names : List[str]
        Names of the target classes.
        
    Returns
    -------
    List[TreeNode]
        List of structured tree nodes representing the complete tree.
        
    Notes
    -----
    Extracts all nodes from the sklearn tree structure and converts them
    to structured TreeNode objects for easier manipulation and visualization.
    """
    tree = tree_classifier.dt.tree_
    nodes = []

    for node_id in range(tree.node_count):
        node = extract_single_node(tree, node_id, feature_names, target_names)
        nodes.append(node)

    return nodes


def convert_numpy_arrays_to_lists(node_dict: Dict[str, Any]) -> None:
    """
    Convert NumPy arrays in node dictionary to lists for JSON serialization.
    
    Parameters
    ----------
    node_dict : Dict[str, Any]
        Node dictionary that may contain NumPy arrays.
        
    Notes
    -----
    Modifies the dictionary in-place by converting 'value' field from
    NumPy array to Python list for JSON compatibility.
    """
    if isinstance(node_dict['value'], np.ndarray):
        node_dict['value'] = node_dict['value'].tolist()


def process_single_node_for_visualization(node: TreeNode) -> Dict[str, Any]:
    """
    Process a TreeNode for frontend visualization.
    
    Parameters
    ----------
    node : TreeNode
        TreeNode object to process.
        
    Returns
    -------
    Dict[str, Any]
        Dictionary representation suitable for JSON serialization.
        
    Notes
    -----
    Converts dataclass to dictionary and ensures all NumPy arrays
    are converted to lists for JSON compatibility.
    """
    node_dict = asdict(node)
    convert_numpy_arrays_to_lists(node_dict)
    return node_dict


def generate_decision_tree_visualization_data_raw(nodes: List[TreeNode]) -> List[Dict[str, Any]]:
    """
    Generate visualization data for decision tree from structured nodes.
    
    Parameters
    ----------
    nodes : List[TreeNode]
        List of structured tree nodes.
        
    Returns
    -------
    List[Dict[str, Any]]
        List of node dictionaries ready for frontend visualization.
        
    Notes
    -----
    Main interface function that converts structured tree representation
    to JSON-serializable format for frontend decision tree visualization.
    Handles NumPy type conversion and ensures proper data formatting.
    """
    nodes_dict = []
    
    for node in nodes:
        node_dict = process_single_node_for_visualization(node)
        nodes_dict.append(node_dict)
    
    return nodes_dict
