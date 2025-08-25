import { getTreeState } from "./state.js";

export function createHierarchy(treeKind) {
    const state = getTreeState(treeKind);
    const data = state.treeData;
    
    if (!data || !Array.isArray(data)) {
        console.error("Invalid data provided to createHierarchy:", data);
        return null;
    }

    if (treeKind === "blocks") {
        // Blocks tree uses different hierarchy building logic
        return buildBlocksHierarchy(data);
    } else {
        // Classic and spawn use the same logic
        return buildStandardHierarchy(data);
    }
}

function buildStandardHierarchy(data) {
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

function buildBlocksHierarchy(flatTreeData) {
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

export function findInstancePath(rootNode, instance, treeKind) {
    const state = getTreeState(treeKind);
    
    // Use parameters or fallback to state
    const instanceData = instance || state.instanceData;
    const root = rootNode || state.hierarchyRoot;
    
    if (!root || !instanceData || typeof instanceData !== "object") {
        console.error("Invalid parameters provided to findInstancePath");
        return [];
    }

    if (treeKind === "spawn") {
        return traceSpawnInstancePath(root, instanceData, state);
    } else {
        return traceStandardInstancePath(root, instanceData);
    }
}

function traceStandardInstancePath(root, instanceData) {
    const path = [];
    let currentNode = root;

    while (currentNode) {
        path.push(currentNode.node_id);

        if (
            currentNode.is_leaf ||
            (!currentNode.left_child && !currentNode.right_child)
        ) {
            break;
        }

        const featureName = currentNode.feature_name;
        const featureValue = instanceData[featureName];
        const threshold = currentNode.threshold;

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

function traceSpawnInstancePath(root, instanceData, state) {
    const path = [];
    const nodesById = {};
    
    // Use state.treeData for lookup if available
    const treeData = state.treeData;
    if (!treeData) {
        console.warn("Missing tree data for spawn path tracing");
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
        const instanceValue = instanceData[featureName];
        
        if (instanceValue === undefined) {
            console.warn(`Feature ${featureName} not found in instance data`);
            break;
        }
        
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

export function getNodeById(nodeId, treeKind) {
    const state = getTreeState(treeKind);
    const root = state.hierarchyRoot;
    
    if (!root) return null;

    if (treeKind === "blocks") {
        // Blocks tree uses different node access
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
    } else {
        // Standard hierarchy traversal
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
}

// Utility functions for spawn tree
export function isNodeInPath(nodeId, instancePath, treeKind) {
    if (treeKind === "spawn") {
        const state = getTreeState(treeKind);
        const path = instancePath || state.instancePath;
        return path && path.includes(nodeId);
    }
    return instancePath && instancePath.includes(nodeId);
}

export function getInstanceValue(featureName, instanceData, treeKind) {
    if (treeKind === "spawn") {
        const state = getTreeState(treeKind);
        const instance = instanceData || state.instanceData;
        if (!instance || !featureName) return null;
        return instance[featureName];
    }
    
    if (!instanceData || !featureName) return null;
    return instanceData[featureName];
}

// Blocks tree specific utilities
export function traceInstancePath(instance, treeKind) {
    if (treeKind !== "blocks") {
        console.warn("traceInstancePath is blocks-specific, use findInstancePath for other trees");
        return findInstancePath(null, instance, treeKind);
    }
    
    const state = getTreeState(treeKind);
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

export function getAllPathsFromHierarchy(treeKind) {
    if (treeKind !== "blocks") {
        console.warn("getAllPathsFromHierarchy is blocks-specific");
        return [];
    }
    
    const state = getTreeState(treeKind);
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