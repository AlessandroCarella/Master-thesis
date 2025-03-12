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

def extract_tree_structure(tree_classifier: DecisionTreeClassifier, feature_names: List[str], target_names: List[str]) -> List[TreeNode]: 
    """
    Extract complete node information from a trained DecisionTreeClassifier

    Parameters:
    -----------
    tree_classifier : DecisionTreeClassifier
        A trained sklearn DecisionTreeClassifier
    feature_names : List[str]
        A list of feature names
    target_names : List[str]
        A list of target class labels

    Returns:
    --------
    List[TreeNode]
        List of TreeNode objects containing the complete tree structure
    """
    try:
        # Validate inputs
        if tree_classifier is None:
            raise ValueError("tree_classifier cannot be None")
            
        if feature_names is None or len(feature_names) == 0:
            raise ValueError("feature_names cannot be None or empty")
            
        if target_names is None or len(target_names) == 0:
            raise ValueError("target_names cannot be None or empty")
            
        tree = tree_classifier.tree_
        
        nodes = []

        for node_id in range(tree.node_count):
            try:
                # Check if node is leaf
                is_leaf = tree.children_left[node_id] == -1

                # Get node information
                if is_leaf:
                    # Get the class label based on the majority class in the leaf
                    class_label_index = int(tree.value[node_id].argmax())
                    if class_label_index >= len(target_names):
                        raise ValueError(f"Class label index {class_label_index} out of range for target_names of length {len(target_names)}")
                    class_label = target_names[class_label_index]
                    
                    node = TreeNode(
                        node_id=node_id,
                        feature_name=None,
                        feature_index=None,
                        threshold=None,
                        left_child=None,
                        right_child=None,
                        is_leaf=True,
                        class_label=class_label,
                        impurity=tree.impurity[node_id],
                        n_samples=int(tree.n_node_samples[node_id]),
                        weighted_n_samples=float(tree.weighted_n_node_samples[node_id]),
                        value=tree.value[node_id].copy()
                    )
                else:
                    feature_index = int(tree.feature[node_id])
                    if feature_index >= len(feature_names):
                        raise ValueError(f"Feature index {feature_index} out of range for feature_names of length {len(feature_names)}")
                    feature_name = feature_names[feature_index]
                    threshold = float(tree.threshold[node_id])
                    left_child = int(tree.children_left[node_id])
                    right_child = int(tree.children_right[node_id])

                    node = TreeNode(
                        node_id=node_id,
                        feature_name=feature_name,
                        feature_index=feature_index,
                        threshold=threshold,
                        left_child=left_child,
                        right_child=right_child,
                        is_leaf=False,
                        class_label=None,
                        impurity=tree.impurity[node_id],
                        n_samples=int(tree.n_node_samples[node_id]),
                        weighted_n_samples=float(tree.weighted_n_node_samples[node_id]),
                        value=tree.value[node_id].copy()
                    )

                nodes.append(node)
            except Exception as e:
                raise RuntimeError(f"Error processing node {node_id}: {str(e)}")

        return nodes
    except Exception as e:
        import logging
        logging.error(f"Error in extract_tree_structure: {str(e)}")
        raise

def generate_decision_tree_visualization_data(nodes):
    """
    Prepare the tree structure for visualization
    
    Parameters:
    -----------
    nodes : List[TreeNode]
        List of TreeNode objects to process
    
    Returns:
    --------
    List[Dict]
        List of node dictionaries suitable for visualization
    """
    try:
        if nodes is None:
            raise ValueError("nodes cannot be None")
            
        # Convert TreeNodes to dictionaries
        nodes_dict = []
        for i, node in enumerate(nodes):
            try:
                node_dict = asdict(node)
                # Convert numpy arrays to lists for JSON serialization
                if isinstance(node_dict['value'], np.ndarray):
                    node_dict['value'] = node_dict['value'].tolist()
                nodes_dict.append(node_dict)
            except Exception as e:
                raise RuntimeError(f"Error processing node at index {i}: {str(e)}")
        
        return nodes_dict
    except Exception as e:
        import logging
        logging.error(f"Error in generate_decision_tree_visualization_data: {str(e)}")
        raise
