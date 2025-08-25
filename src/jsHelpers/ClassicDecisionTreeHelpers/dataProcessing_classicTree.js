import { classicTreeState } from "../TreesCommon/state.js";

export function createHierarchy() {
    const data = classicTreeState.treeData;
    
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data provided to createHierarchy:", data);
        return null;
    }

    const nodesById = {};
    data.forEach((node) => {
        nodesById[node.node_id] = { ...node, children: [] };
    });

    const root = nodesById[0];
    if (!root) {
        console.error("No root node found in data");
        return null;
    }

    data.forEach((node) => {
        if (node.left_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.left_child]);
        }
        if (node.right_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.right_child]);
        }
    });

    return root;
}

export function findInstancePath(rootNode, instance) {
    // Use instance from classicTreeState if not provided
    const instanceData = instance || classicTreeState.instanceData;
    const root = rootNode || classicTreeState.hierarchyRoot;
    
    // Add validation for instance parameter
    if (!root || !instanceData || typeof instanceData !== "object") {
        console.error("Invalid parameters provided to findInstancePath");
        return [];
    }

    // This function will return an array of node_ids that form the path
    const path = [];
    let currentNode = root;

    while (currentNode) {
        path.push(currentNode.node_id);

        // Leaf node - we've reached the end of the path
        if (
            currentNode.is_leaf ||
            (!currentNode.left_child && !currentNode.right_child)
        ) {
            break;
        }

        // Determine which child to follow
        const featureName = currentNode.feature_name;
        const featureValue = instanceData[featureName];
        const threshold = currentNode.threshold;

        // If feature value is less than threshold, go left; otherwise, go right
        if (featureValue < threshold) {
            currentNode = currentNode.children.find(
                (child) => child.node_id === currentNode.left_child
            );
        } else {
            currentNode = currentNode.children.find(
                (child) => child.node_id === currentNode.right_child
            );
        }
    }

    return path;
}

// Helper function to get node by ID from the hierarchy
export function getNodeById(nodeId) {
    const root = classicTreeState.hierarchyRoot;
    if (!root) return null;

    function dfs(node) {
        if (node.node_id === nodeId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = dfs(child);
                if (found) return found;
            }
        }
        return null;
    }
    return dfs(root);
}

// Helper function to get all leaf nodes
export function getAllLeaves() {
    const root = classicTreeState.hierarchyRoot;
    if (!root) return [];
    
    const leaves = [];
    function traverse(node) {
        if (node.is_leaf || !node.children || node.children.length === 0) {
            leaves.push(node);
        } else {
            node.children.forEach(child => traverse(child));
        }
    }
    
    traverse(root);
    return leaves;
}

// Helper function to get all nodes
export function getAllNodes() {
    const root = classicTreeState.hierarchyRoot;
    if (!root) return [];
    
    const nodes = [];
    function traverse(node) {
        nodes.push(node);
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    traverse(root);
    return nodes;
}