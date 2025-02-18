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
