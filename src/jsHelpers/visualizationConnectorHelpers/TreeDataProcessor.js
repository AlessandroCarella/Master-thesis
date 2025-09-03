// TreeDataProcessor.js - Updated to use encoded features only
import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { getTreeState } from "../TreesCommon/state.js";

// Base strategy interface
class TreeProcessingStrategy {
    buildHierarchy(data) { throw new Error('Must implement buildHierarchy'); }
    tracePath(root, instance) { throw new Error('Must implement tracePath'); }
    findNode(root, nodeId) { throw new Error('Must implement findNode'); }
    getAllPaths(root) { throw new Error('Must implement getAllPaths'); }
    isNodeInPath(nodeId, instancePath) { return instancePath?.includes(nodeId) ?? false; }
    getInstanceValue(featureName, instanceData) { return instanceData?.[featureName] ?? null; }
}

// Standard tree processing (Classic and Spawn) - using encoded features only
class StandardTreeProcessingStrategy extends TreeProcessingStrategy {
    buildHierarchy(data) {
        if (!data || !Array.isArray(data)) {
            console.error("Invalid data provided to buildHierarchy:", data);
            return null;
        }

        const nodesById = {};
        data.forEach(node => {
            nodesById[node.node_id] = { ...node, children: [] };
        });

        const root = nodesById[0];
        if (!root) {
            console.error("No root node found in data");
            return null;
        }

        data.forEach(node => {
            if (node.left_child !== null) {
                nodesById[node.node_id].children.push(nodesById[node.left_child]);
            }
            if (node.right_child !== null) {
                nodesById[node.node_id].children.push(nodesById[node.right_child]);
            }
        });

        return root;
    }
    
    tracePath(root, instance) {
        if (!root || !instance || typeof instance !== "object") {
            console.error("Invalid parameters provided to tracePath");
            return [];
        }

        const path = [];
        let currentNode = root;

        while (currentNode && !currentNode.is_leaf) {
            path.push(currentNode.node_id);

            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const featureValue = instance[featureName];

            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in instance data`);
                break;
            }

            // Simple threshold comparison for all features (encoded)
            const goLeft = featureValue <= threshold;

            currentNode = currentNode.children?.find(child =>
                goLeft ? 
                    child.node_id === currentNode.left_child :
                    child.node_id === currentNode.right_child
            );
        }
        
        // Add the final leaf node
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }

        return path;
    }
    
    findNode(root, nodeId) {
        if (!root) return null;

        function search(node) {
            if (node.node_id === nodeId) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
            }
            return null;
        }
        return search(root);
    }
    
    getAllPaths(root) {
        const paths = [];
        
        function traverse(node, currentPath) {
            const newPath = [...currentPath, node.node_id];
            
            if (node.is_leaf || !node.children?.length) {
                paths.push(newPath);
            } else {
                node.children.forEach(child => traverse(child, newPath));
            }
        }
        
        if (root) traverse(root, []);
        return paths;
    }
}

// Blocks tree specific processing - using encoded features only
class BlocksTreeProcessingStrategy extends TreeProcessingStrategy {
    buildHierarchy(data) {
        if (!data || !Array.isArray(data)) {
            console.error("Invalid data provided to buildHierarchy:", data);
            return null;
        }

        const nodeMap = new Map();
        data.forEach(node => nodeMap.set(node.node_id, { ...node, children: [] }));

        let root = null;
        nodeMap.forEach(node => {
            if (node.node_id === 0) {
                root = node;
            } else {
                const parent = this._findParent(node.node_id, nodeMap);
                if (parent) parent.children.push(node);
            }
        });

        if (!root) {
            console.error("No root node found in blocks tree data");
            return null;
        }

        const hierarchy = d3.hierarchy(root, d => d.children);
        const tree = d3.tree();
        tree(hierarchy);
        return hierarchy;
    }
    
    tracePath(hierarchyRoot, instance) {
        if (!hierarchyRoot || !instance || typeof instance !== "object") {
            console.error("Invalid parameters provided to tracePath");
            return [];
        }

        const path = [];
        let currentNode = hierarchyRoot;
        
        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);

            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = instance[featureName];

            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in instance data`);
                break;
            }

            // Simple threshold comparison for all features (encoded)
            const goLeft = featureValue <= threshold;

            const parentData = currentNode.data;

            currentNode = currentNode.children?.find(child => {
                const childId = child.data.node_id;
                return goLeft
                    ? childId === parentData.left_child
                    : childId === parentData.right_child;
            });
        }
        
        // Add the final leaf node
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    findNode(hierarchyRoot, nodeId) {
        if (!hierarchyRoot) return null;

        function search(node) {
            if (node.data.node_id === nodeId) return node.data;
            if (node.children) {
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
            }
            return null;
        }
        return search(hierarchyRoot);
    }
    
    getAllPaths(hierarchyRoot) {
        const paths = [];
        
        function traverse(node, currentPath) {
            const newPath = [...currentPath, node.data.node_id];
            
            if (node.data.is_leaf || !node.children?.length) {
                paths.push(newPath);
            } else {
                node.children.forEach(child => traverse(child, newPath));
            }
        }
        
        if (hierarchyRoot) traverse(hierarchyRoot, []);
        return paths;
    }
    
    _findParent(nodeId, nodeMap) {
        for (const [, parentNode] of nodeMap) {
            if (parentNode.left_child === nodeId || parentNode.right_child === nodeId) {
                return parentNode;
            }
        }
        return null;
    }
}

// Spawn tree specific processing (extends standard) - using encoded features only
class SpawnTreeProcessingStrategy extends StandardTreeProcessingStrategy {
    tracePath(rootOrState, instance, useRawData = false) {
        // Handle different parameter patterns
        let root, treeData;
        
        if (rootOrState && rootOrState.treeData) {
            // Called with state object
            root = rootOrState.hierarchyRoot;
            treeData = rootOrState.treeData;
        } else {
            // Called with root node
            root = rootOrState;
            const state = getTreeState(TREES_SETTINGS.treeKindID.spawn);
            treeData = state.treeData;
        }

        if (useRawData && treeData) {
            return this._tracePathFromRawData(treeData, instance);
        } else {
            return super.tracePath(root, instance);
        }
    }
    
    _tracePathFromRawData(treeData, instance) {
        const path = [];
        const nodesById = {};
        
        // Create lookup for nodes
        treeData.forEach(node => {
            nodesById[node.node_id] = node;
        });
        
        let currentNode = nodesById[0]; // Start at root
        
        while (currentNode && !currentNode.is_leaf) {
            path.push(currentNode.node_id);
            
            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const featureValue = instance[featureName];

            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in instance data`);
                break;
            }
            
            // Simple threshold comparison for all features (encoded)
            const goLeft = featureValue <= threshold;
            
            currentNode = goLeft ? 
                nodesById[currentNode.left_child] : 
                nodesById[currentNode.right_child];
        }
        
        // Add the final leaf node
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }
        
        return path;
    }
}

// Main processor class
class TreeDataProcessor {
    constructor(treeKind) {
        this.treeKind = treeKind;
        this.state = getTreeState(treeKind);
        this.strategy = this._getStrategy();
    }
    
    _getStrategy() {
        const strategies = {
            [TREES_SETTINGS.treeKindID.classic]: new StandardTreeProcessingStrategy(),
            [TREES_SETTINGS.treeKindID.spawn]: new SpawnTreeProcessingStrategy(), 
            [TREES_SETTINGS.treeKindID.blocks]: new BlocksTreeProcessingStrategy()
        };
        return strategies[this.treeKind] || new StandardTreeProcessingStrategy();
    }
    
    // Main interface methods
    createHierarchy(data) {
        this.state.treeData = data;
        this.state.hierarchyRoot = this.strategy.buildHierarchy(data);
        return this.state.hierarchyRoot;
    }
    
    findInstancePath(instance) {
        const instanceData = instance || this.state.instanceData;
        return this.strategy.tracePath(this.state.hierarchyRoot, instanceData);
    }
    
    getNodeById(nodeId) {
        return this.strategy.findNode(this.state.hierarchyRoot, nodeId);
    }
    
    getAllPaths() {
        return this.strategy.getAllPaths(this.state.hierarchyRoot);
    }
    
    isNodeInPath(nodeId, instancePath) {
        return this.strategy.isNodeInPath(nodeId, instancePath);
    }
    
    getInstanceValue(featureName, instanceData) {
        return this.strategy.getInstanceValue(featureName, instanceData);
    }
    
    // Spawn tree specific method
    traceInstancePath(instance, useRawData = false) {
        if (this.treeKind === TREES_SETTINGS.treeKindID.spawn) {
            return this.strategy.tracePath(this.state, instance, useRawData);
        }
        return this.findInstancePath(instance);
    }
}

// Factory and convenience functions
export class TreeDataProcessorFactory {
    static create(treeKind) {
        return new TreeDataProcessor(treeKind);
    }
    
    // Backward compatibility methods that match original API
    static createHierarchy(treeKind) {
        const processor = this.create(treeKind);
        // Get data from state like the original function did
        const data = processor.state.treeData;
        if (!data) {
            console.error(`No tree data found in state for ${treeKind}`);
            return null;
        }
        return processor.strategy.buildHierarchy(data);
    }
    
    static findInstancePath(treeKind, rootNode, instance) {
        const processor = this.create(treeKind);
        // Handle different parameter patterns for backward compatibility
        if (rootNode && instance) {
            // Called with explicit root and instance
            return processor.strategy.tracePath(rootNode, instance);
        } else if (rootNode && !instance) {
            // Called with just instance (rootNode is actually instance)
            return processor.strategy.tracePath(processor.state.hierarchyRoot, rootNode);
        } else {
            // Called with no parameters, use state
            return processor.strategy.tracePath(processor.state.hierarchyRoot, processor.state.instanceData);
        }
    }
    
    static getNodeById(treeKind, nodeId) {
        const processor = this.create(treeKind);
        return processor.strategy.findNode(processor.state.hierarchyRoot, nodeId);
    }
    
    static getAllPaths(treeKind) {
        const processor = this.create(treeKind);
        return processor.strategy.getAllPaths(processor.state.hierarchyRoot);
    }
    
    static traceInstancePath(treeKind, instance) {
        const processor = this.create(treeKind);
        if (processor.treeKind === TREES_SETTINGS.treeKindID.spawn) {
            return processor.strategy.tracePath(processor.state, instance, false);
        }
        return processor.strategy.tracePath(processor.state.hierarchyRoot, instance);
    }
}

// Export backward compatibility functions that match original API signatures
export function createHierarchy(treeKind) {
    return TreeDataProcessorFactory.createHierarchy(treeKind);
}

export function findInstancePath(rootNode, instance, treeKind) {
    return TreeDataProcessorFactory.findInstancePath(treeKind, rootNode, instance);
}

export function getNodeById(nodeId, treeKind) {
    return TreeDataProcessorFactory.getNodeById(treeKind, nodeId);
}

export function getAllPathsFromHierarchy(treeKind) {
    return TreeDataProcessorFactory.getAllPaths(treeKind);
}

export function traceInstancePath(instance, treeKind) {
    return TreeDataProcessorFactory.traceInstancePath(treeKind, instance);
}

export function isNodeInPath(nodeId, instancePath, treeKind) {
    const processor = TreeDataProcessorFactory.create(treeKind);
    return processor.isNodeInPath(nodeId, instancePath);
}

function getInstanceValue(featureName, instanceData, treeKind) {
    const processor = TreeDataProcessorFactory.create(treeKind);
    return processor.getInstanceValue(featureName, instanceData);
}
