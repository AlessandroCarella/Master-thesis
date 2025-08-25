import { blocksTreeState } from "../TreesCommon/state.js"

// Build D3 hierarchy from flat array and compute a tree layout
export function buildHierarchy(flatTreeData) {
    const nodeMap = new Map();
    flatTreeData.forEach((node) =>
        nodeMap.set(node.node_id, { ...node, children: [] })
    );

    let root = null;
    nodeMap.forEach((node) => {
        if (node.node_id === 0) {
            root = node;
        } else {
            const parent = findParent(node.node_id, nodeMap);
            if (parent) parent.children.push(node);
        }
    });

    const hierarchy = d3.hierarchy(root, (d) => d.children);
    const tree = d3.tree();
    tree(hierarchy);
    return hierarchy;
}

function findParent(nodeId, nodeMap) {
    for (const [, parentNode] of nodeMap) {
        if (
            parentNode.left_child === nodeId ||
            parentNode.right_child === nodeId
        )
            return parentNode;
    }
    return null;
}

export function traceInstancePath(instance) {
    let node = blocksTreeState.hierarchyRoot;
    const path = [];
    while (node) {
        path.push(node.data.node_id);
        if (node.data.is_leaf || !node.children) break;

        const featureName = node.data.feature_name;
        const threshold = node.data.threshold;
        const value = instance?.[featureName];

        const goLeft = value <= threshold;
        const parentData = node.data;

        node = node.children.find((child) => {
            const childId = child.data.node_id;
            return goLeft
                ? childId === parentData.left_child
                : childId === parentData.right_child;
        });
    }
    return path;
}

export function getAllPathsFromHierarchy() {
    const paths = [];
    function traverse(node, current) {
        const next = [...current, node.data.node_id];
        if (node.data.is_leaf || !node.children || node.children.length === 0) {
            paths.push(next);
        } else {
            node.children.forEach((c) => traverse(c, next));
        }
    }
    if (blocksTreeState.hierarchyRoot) traverse(blocksTreeState.hierarchyRoot, []);
    return paths;
}