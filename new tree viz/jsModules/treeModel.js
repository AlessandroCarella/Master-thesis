import { state } from "./state.js";
import { DEFAULT_COLORS, SPLIT_NODE_COLOR } from "./constants.js";

// Build D3 hierarchy from flat array and compute a tree layout (positions not used directly)
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
    const tree = d3.tree().size([800, 600]);
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

export function getNodeById(nodeId) {
    const root = state.hierarchyRoot;
    if (!root) return null;

    function dfs(node) {
        if (node.data.node_id === nodeId) return node.data;
        if (node.children) {
            for (const c of node.children) {
                const f = dfs(c);
                if (f) return f;
            }
        }
        return null;
    }
    return dfs(root);
}

export function getAllLeaves() {
    return state.hierarchyRoot
        ? state.hierarchyRoot.leaves().map((d) => d.data)
        : [];
}

export function getAllNodes() {
    return state.hierarchyRoot
        ? state.hierarchyRoot.descendants().map((d) => d.data)
        : [];
}

export function getPathToNode(targetNodeId) {
    const root = state.hierarchyRoot;
    if (!root) return [];

    function findPath(node, path = []) {
        const current = [...path, node.data.node_id];
        if (node.data.node_id === targetNodeId) return current;
        if (node.children) {
            for (const child of node.children) {
                const found = findPath(child, current);
                if (found.length) return found;
            }
        }
        return [];
    }

    return findPath(root);
}

export function getTreeDepth() {
    return state.hierarchyRoot ? state.hierarchyRoot.height : 0;
}

export function getClassDistribution(leaves) {
    const dist = {};
    leaves.forEach((leaf) => {
        const cls = leaf.class_label || "unknown";
        dist[cls] = (dist[cls] || 0) + 1;
    });
    return dist;
}

export function getTreeStats() {
    if (!state.hierarchyRoot) return {};
    const allNodes = getAllNodes();
    const leaves = getAllLeaves();
    return {
        totalNodes: allNodes.length,
        leafNodes: leaves.length,
        internalNodes: allNodes.length - leaves.length,
        maxDepth: getTreeDepth(),
        classDistribution: getClassDistribution(leaves),
    };
}

export function getUniqueClasses() {
    const leaves = getAllLeaves();
    return [...new Set(leaves.map((l) => l.class_label || "unknown"))].sort();
}

export function getNodeColor(nodeId) {
    const node = getNodeById(nodeId);
    if (!node) return SPLIT_NODE_COLOR;
    if (node.is_leaf) {
        const cls = node.class_label || "unknown";
        const unique = getUniqueClasses();
        const idx = unique.indexOf(cls);
        return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    }
    return SPLIT_NODE_COLOR;
}

export function getStrokeWidth(targetNodeId) {
    const targetNode = getNodeById(targetNodeId);    
    const totalSamples = state.treeData[0].n_samples;

    const ratio = targetNode.weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * totalSamples / 30;

    return strokeWidth;
}

export function traceInstancePath(instance) {
    let node = state.hierarchyRoot;
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
    if (state.hierarchyRoot) traverse(state.hierarchyRoot, []);
    return paths;
}
