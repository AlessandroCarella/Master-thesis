import { TREES_SETTINGS } from "./settings.js";
import { getTreeState } from "./state";

// Find path from root to a specific node in any tree
export function getPathToNode(targetNodeId, treeKind) {
    const state = getTreeState(treeKind);
    const root = state.hierarchyRoot;
    
    if (!root) return [];

    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return getPathToNodeBlocks(targetNodeId);
    } else if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        return getPathToNodeSpawn(targetNodeId, state);
    } else {
        return getPathToNodeClassic(targetNodeId, root);
    }
}

function getPathToNodeClassic(targetNodeId, root) {
    function findPath(node, path = []) {
        const current = [...path, node.node_id];
        if (node.node_id === targetNodeId) return current;
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

function getPathToNodeBlocks(targetNodeId) {
    const state = getTreeState(TREES_SETTINGS.treeKindID.blocks);
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

function getPathToNodeSpawn(targetNodeId, state) {
    // First try to use instance path if the node is in it
    if (state.instancePath && state.instancePath.includes(targetNodeId)) {
        const nodeIndex = state.instancePath.indexOf(targetNodeId);
        return state.instancePath.slice(0, nodeIndex + 1);
    }

    // If not in instance path, find path from tree structure
    if (!state.treeData) return [];

    // Create node lookup from raw tree data
    const nodesById = {};
    state.treeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    // Find path from root (node_id = 0) to target node
    function findPath(currentNodeId, targetNodeId, path = []) {
        const newPath = [...path, currentNodeId];
        
        if (currentNodeId === targetNodeId) {
            return newPath;
        }
        
        const currentNode = nodesById[currentNodeId];
        if (!currentNode || currentNode.is_leaf) {
            return null;
        }
        
        // Try left child
        if (currentNode.left_child !== null) {
            const leftPath = findPath(currentNode.left_child, targetNodeId, newPath);
            if (leftPath) return leftPath;
        }
        
        // Try right child  
        if (currentNode.right_child !== null) {
            const rightPath = findPath(currentNode.right_child, targetNodeId, newPath);
            if (rightPath) return rightPath;
        }
        
        return null;
    }
    
    return findPath(0, targetNodeId) || [];
}

// Check if a node is in a given path
export function isNodeInPath(nodeId, path) {
    return path && Array.isArray(path) && path.includes(nodeId);
}

// Get the common prefix of two paths
export function getCommonPathPrefix(pathA, pathB) {
    if (!pathA || !pathB) return [];
    
    const commonPath = [];
    const minLength = Math.min(pathA.length, pathB.length);
    
    for (let i = 0; i < minLength; i++) {
        if (pathA[i] === pathB[i]) {
            commonPath.push(pathA[i]);
        } else {
            break;
        }
    }
    
    return commonPath;
}

// Find the branch point between a path and the instance path
export function findBranchPoint(path, instancePath) {
    if (!path || !instancePath) return 0;
    
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) {
            branchPoint = i;
        } else {
            break;
        }
    }
    
    return branchPoint;
}

// Validate if a path is valid in the tree
export function validatePath(path, treeKind) {
    if (!path || !Array.isArray(path) || path.length === 0) {
        return false;
    }
    
    const state = getTreeState(treeKind);
    
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return validateBlocksPath(path, state);
    } else if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        return validateSpawnPath(path, state);
    } else {
        return validateClassicPath(path, state);
    }
}

function validateClassicPath(path, state) {
    const root = state.hierarchyRoot;
    if (!root) return false;
    
    // Check if all nodes in path exist and are connected
    for (let i = 0; i < path.length - 1; i++) {
        const parentId = path[i];
        const childId = path[i + 1];
        
        const parentNode = findNodeById(root, parentId);
        if (!parentNode || !parentNode.children) return false;
        
        const childExists = parentNode.children.some(child => child.node_id === childId);
        if (!childExists) return false;
    }
    
    return true;
}

function validateBlocksPath(path, state) {
    const root = state.hierarchyRoot;
    if (!root) return false;
    
    // Similar validation for blocks tree with d3 hierarchy structure
    for (let i = 0; i < path.length - 1; i++) {
        const parentId = path[i];
        const childId = path[i + 1];
        
        const parentNode = findBlocksNodeById(root, parentId);
        if (!parentNode || !parentNode.children) return false;
        
        const childExists = parentNode.children.some(child => child.data.node_id === childId);
        if (!childExists) return false;
    }
    
    return true;
}

function validateSpawnPath(path, state) {
    if (!state.treeData) return false;
    
    const nodesById = {};
    state.treeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    // Check if all nodes exist and are connected
    for (let i = 0; i < path.length - 1; i++) {
        const parentId = path[i];
        const childId = path[i + 1];
        
        const parentNode = nodesById[parentId];
        if (!parentNode) return false;
        
        const isValidChild = parentNode.left_child === childId || parentNode.right_child === childId;
        if (!isValidChild) return false;
    }
    
    return true;
}

// Helper function to find node by ID in standard hierarchy
function findNodeById(root, nodeId) {
    if (root.node_id === nodeId) return root;
    
    if (root.children) {
        for (const child of root.children) {
            const found = findNodeById(child, nodeId);
            if (found) return found;
        }
    }
    
    return null;
}

// Helper function to find node by ID in blocks hierarchy  
function findBlocksNodeById(root, nodeId) {
    if (root.data.node_id === nodeId) return root;
    
    if (root.children) {
        for (const child of root.children) {
            const found = findBlocksNodeById(child, nodeId);
            if (found) return found;
        }
    }
    
    return null;
}

// Get all possible paths from root to leaves
export function getAllPathsToLeaves(treeKind) {
    const state = getTreeState(treeKind);
    
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return getAllPathsFromHierarchy();
    } else {
        return getAllPathsStandard(state.hierarchyRoot);
    }
}

function getAllPathsStandard(root) {
    if (!root) return [];
    
    const paths = [];
    
    function traverse(node, currentPath) {
        const newPath = [...currentPath, node.node_id];
        
        if (node.is_leaf || !node.children || node.children.length === 0) {
            paths.push(newPath);
        } else {
            node.children.forEach(child => {
                traverse(child, newPath);
            });
        }
    }
    
    traverse(root, []);
    return paths;
}

function getAllPathsFromHierarchy() {
    const state = getTreeState(TREES_SETTINGS.treeKindID.blocks);
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

// Compare two paths
export function pathsEqual(pathA, pathB) {
    if (!pathA || !pathB) return false;
    if (pathA.length !== pathB.length) return false;
    
    return pathA.every((nodeId, index) => nodeId === pathB[index]);
}

// Get path segment between two node IDs
export function getPathSegment(fullPath, startNodeId, endNodeId) {
    if (!fullPath || !Array.isArray(fullPath)) return [];
    
    const startIndex = fullPath.indexOf(startNodeId);
    const endIndex = fullPath.indexOf(endNodeId);
    
    if (startIndex === -1 || endIndex === -1) return [];
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    return fullPath.slice(start, end + 1);
}   