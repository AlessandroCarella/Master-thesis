from sklearn.tree import DecisionTreeClassifier
from dataclasses import dataclass
from typing import List, Optional
from dataclasses import asdict

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

def extract_tree_structure(tree_classifier: DecisionTreeClassifier, feature_names: List[str], target_names: List[str]) -> List[TreeNode]: 
    """
    Extract node information from a trained DecisionTreeClassifier

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
        List of TreeNode objects containing the tree structure
    """
    tree = tree_classifier.tree_
    
    nodes = []

    for node_id in range(tree.node_count):
        # Check if node is leaf
        is_leaf = tree.children_left[node_id] == -1

        # Get node information
        if is_leaf:
            # Get the class label based on the majority class in the leaf
            class_label_index = int(tree.value[node_id].argmax())
            class_label = target_names[class_label_index]
            
            node = TreeNode(
                node_id=node_id,
                feature_name=None,
                threshold=None,
                left_child=None,
                right_child=None,
                is_leaf=True,
                class_label=class_label,
                samples=int(tree.n_node_samples[node_id])
            )
        else:
            feature_name = feature_names[int(tree.feature[node_id])]
            threshold = float(tree.threshold[node_id])
            left_child = int(tree.children_left[node_id])
            right_child = int(tree.children_right[node_id])

            node = TreeNode(
                node_id=node_id,
                feature_name=feature_name,
                threshold=threshold,
                left_child=left_child,
                right_child=right_child,
                is_leaf=False,
                class_label=None,
                samples=int(tree.n_node_samples[node_id])
            )

        nodes.append(node)

    return nodes

def generate_decision_tree_visualization_data(nodes):
    """
    Save the tree structure to a JSON file
    
    Parameters:
    -----------
    nodes : List[TreeNode]
        List of TreeNode objects to save
    filename : str
        Path to save the JSON file
    indent : int
        Number of spaces for indentation
    """
    # Convert TreeNodes to dictionaries
    nodes_dict = [asdict(node) for node in nodes]
    
    return nodes_dict
