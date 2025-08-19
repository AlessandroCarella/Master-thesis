// Function to trace the path through the decision tree for a given instance
export function traceInstancePath(rawTreeData, instanceData) {
    const path = [];
    const nodesById = {};
    
    // Create lookup for nodes
    rawTreeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    let currentNode = nodesById[0]; // Start at root
    
    while (currentNode && !currentNode.is_leaf) {
        path.push(currentNode.node_id);
        
        const featureName = currentNode.feature_name;
        const threshold = currentNode.threshold;
        const instanceValue = instanceData[featureName];
        
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
    
    return path;
}

// Helper function to check if a node is in the instance path
export function isNodeInPath(nodeId, instancePath) {
    return instancePath && instancePath.includes(nodeId);
}

// Function to get instance value for a feature
export function getInstanceValue(featureName, instanceData) {
    if (!instanceData || !featureName) return null;
    return instanceData[featureName];
}