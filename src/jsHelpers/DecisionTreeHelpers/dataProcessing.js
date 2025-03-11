export function createHierarchy(data) {
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
    // Add validation for instance parameter
    if (!rootNode || !instance || typeof instance !== 'object') {
        console.error("Invalid parameters provided to findInstancePath");
        return [];
    }
    
    // This function will return an array of node_ids that form the path
    const path = [];
    let currentNode = rootNode;

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
        const featureValue = instance[featureName];
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
