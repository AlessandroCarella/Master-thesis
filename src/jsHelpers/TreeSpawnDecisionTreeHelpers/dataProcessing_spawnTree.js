import { spawnTreeState } from "../TreesCommon/state.js";

export function createHierarchy() {
    const data = spawnTreeState.treeData;
    
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
    // Use instance from spawnTreeState if not provided
    const instanceData = instance || spawnTreeState.instanceData;
    const root = rootNode || spawnTreeState.hierarchyRoot;
    
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

// Function to trace the path through the decision tree for a given instance
export function traceInstancePath(rawTreeData, instanceData) {
    const path = [];
    const nodesById = {};
    
    // Use spawnTreeState data if not provided
    const treeData = rawTreeData || spawnTreeState.treeData;
    const instance = instanceData || spawnTreeState.instanceData;
    
    if (!treeData || !instance) {
        console.warn("Missing tree data or instance data for path tracing");
        return [];
    }
    
    // Create lookup for nodes
    treeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    let currentNode = nodesById[0]; // Start at root
    
    while (currentNode && !currentNode.is_leaf) {
        path.push(currentNode.node_id);
        
        const featureName = currentNode.feature_name;
        const threshold = currentNode.threshold;
        const instanceValue = instance[featureName];
        
        if (instanceValue === undefined) {
            console.warn(`Feature ${featureName} not found in instance data`);
            break;
        }
        
        // Decide which child to follow
        if (instanceValue <= threshold) {
            currentNode = nodesById[currentNode.left_child];
        } else {
            currentNode = nodesById[currentNode.right_child];
        }
    }
    
    // Add the final leaf node
    if (currentNode && currentNode.is_leaf) {
        path.push(currentNode.node_id);
    }
    
    // Store in spawnTreeState
    spawnTreeState.instancePath = path;
    return path;
}

// Helper function to get node by ID from the hierarchy
export function getNodeById(nodeId) {
    const root = spawnTreeState.hierarchyRoot;
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
    const root = spawnTreeState.hierarchyRoot;
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
    const root = spawnTreeState.hierarchyRoot;
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

// Helper function to check if a node is in the instance path
export function isNodeInPath(nodeId, instancePath) {
    const path = instancePath || spawnTreeState.instancePath;
    return path && path.includes(nodeId);
}

// Function to get instance value for a feature
export function getInstanceValue(featureName, instanceData) {
    const instance = instanceData || spawnTreeState.instanceData;
    if (!instance || !featureName) return null;
    return instance[featureName];
}