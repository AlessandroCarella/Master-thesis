/**
 * @fileoverview Tree data processing system using strategy pattern for different tree types.
 * Handles hierarchy creation, path tracing, and node finding with encoded feature support.
 * @author Generated documentation
 * @module TreeDataProcessor
 */

import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { getTreeState } from "../TreesCommon/state.js";

/**
 * @typedef {Object} TreeNode
 * @property {number} node_id - Unique node identifier
 * @property {boolean} is_leaf - Whether node is a leaf
 * @property {string} [feature_name] - Feature name for split nodes
 * @property {number} [threshold] - Split threshold for split nodes
 * @property {number} [left_child] - Left child node ID
 * @property {number} [right_child] - Right child node ID
 * @property {number} [class_label] - Class label for leaf nodes
 * @property {Array<TreeNode>} [children] - Child nodes array
 */

/**
 * @typedef {Object} TreeState
 * @property {Array<TreeNode>} treeData - Raw tree node data
 * @property {Object} instanceData - Instance data for path tracing
 * @property {Object} hierarchyRoot - Processed hierarchy root
 * @property {Array<number>} [instancePath] - Cached instance path
 */

/**
 * Base strategy interface for tree processing operations.
 * Defines common methods that all tree processing strategies must implement.
 * 
 * @abstract
 * @class
 */
class TreeProcessingStrategy {
    /**
     * Builds hierarchical structure from raw tree data.
     * 
     * @abstract
     * @param {Array<TreeNode>} data - Raw tree node data
     * @returns {Object} Hierarchical tree structure
     * @throws {Error} Must be implemented by subclasses
     */
    buildHierarchy(data) { 
        throw new Error('Must implement buildHierarchy'); 
    }
    
    /**
     * Traces path through tree for given instance data.
     * 
     * @abstract
     * @param {Object} root - Tree root node
     * @param {Object} instance - Instance data for path tracing
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @throws {Error} Must be implemented by subclasses
     */
    tracePath(root, instance) { 
        throw new Error('Must implement tracePath'); 
    }
    
    /**
     * Finds specific node by ID in tree structure.
     * 
     * @abstract
     * @param {Object} root - Tree root node
     * @param {number} nodeId - Node ID to find
     * @returns {Object|null} Found node or null
     * @throws {Error} Must be implemented by subclasses
     */
    findNode(root, nodeId) { 
        throw new Error('Must implement findNode'); 
    }
    
    /**
     * Gets all paths from root to leaves.
     * 
     * @abstract
     * @param {Object} root - Tree root node
     * @returns {Array<Array<number>>} All root-to-leaf paths
     * @throws {Error} Must be implemented by subclasses
     */
    getAllPaths(root) { 
        throw new Error('Must implement getAllPaths'); 
    }
    
    /**
     * Checks if node ID is in given path.
     * 
     * @param {number} nodeId - Node ID to check
     * @param {Array<number>} instancePath - Path to check
     * @returns {boolean} True if node is in path
     */
    isNodeInPath(nodeId, instancePath) { 
        return instancePath?.includes(nodeId) ?? false; 
    }
    
    /**
     * Gets feature value from instance data.
     * 
     * @param {string} featureName - Name of feature
     * @param {Object} instanceData - Instance data object
     * @returns {*} Feature value or null
     */
    getInstanceValue(featureName, instanceData) { 
        return instanceData?.[featureName] ?? null; 
    }
}

/**
 * Standard tree processing strategy for Classic and Spawn trees.
 * Uses encoded features for threshold comparisons and path tracing.
 * 
 * @class
 * @extends TreeProcessingStrategy
 * @example
 * const strategy = new StandardTreeProcessingStrategy();
 * const hierarchy = strategy.buildHierarchy(rawTreeData);
 */
class StandardTreeProcessingStrategy extends TreeProcessingStrategy {
    /**
     * Builds hierarchical structure from raw tree data.
     * Creates parent-child relationships and validates data structure.
     * 
     * @param {Array<TreeNode>} data - Raw tree node data
     * @returns {Object|null} Root node with children structure
     * @throws {Error} When data is invalid or root node missing
     * @example
     * const hierarchy = strategy.buildHierarchy([
     *   { node_id: 0, is_leaf: false, left_child: 1, right_child: 2 },
     *   { node_id: 1, is_leaf: true, class_label: 0 },
     *   { node_id: 2, is_leaf: true, class_label: 1 }
     * ]);
     */
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
    
    /**
     * Traces path through tree using encoded feature values.
     * Follows decision path from root to leaf based on feature thresholds.
     * 
     * @param {Object} root - Tree root node
     * @param {Object} instance - Instance data with encoded features
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @throws {Error} When parameters are invalid
     * @example
     * const path = strategy.tracePath(root, {
     *   feature1_encoded: 1.0,
     *   feature2_cat_A: 1
     * });
     * // Returns: [0, 1, 3] (root -> internal -> leaf)
     */
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

            const goLeft = featureValue <= threshold;

            currentNode = currentNode.children?.find(child =>
                goLeft ? 
                    child.node_id === currentNode.left_child :
                    child.node_id === currentNode.right_child
            );
        }
        
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }

        return path;
    }
    
    /**
     * Finds node by ID in tree structure using recursive search.
     * 
     * @param {Object} root - Tree root node
     * @param {number} nodeId - Node ID to find
     * @returns {Object|null} Found node or null
     * @example
     * const node = strategy.findNode(root, 5);
     * if (node) {
     *   console.log('Found node:', node.node_id);
     * }
     */
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
    
    /**
     * Gets all paths from root to leaves using recursive traversal.
     * 
     * @param {Object} root - Tree root node
     * @returns {Array<Array<number>>} All root-to-leaf paths
     * @example
     * const paths = strategy.getAllPaths(root);
     * // Returns: [[0, 1], [0, 2, 3], [0, 2, 4]]
     */
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

/**
 * Blocks tree specific processing strategy.
 * Uses D3 hierarchy for layout and parent-finding operations.
 * 
 * @class
 * @extends TreeProcessingStrategy
 * @example
 * const strategy = new BlocksTreeProcessingStrategy();
 * const hierarchy = strategy.buildHierarchy(blocksTreeData);
 */
class BlocksTreeProcessingStrategy extends TreeProcessingStrategy {
    /**
     * Builds D3 hierarchy structure for blocks tree layout.
     * Creates parent-child relationships and D3 tree layout.
     * 
     * @param {Array<TreeNode>} data - Raw tree node data
     * @returns {d3.HierarchyNode|null} D3 hierarchy root
     * @throws {Error} When data is invalid or root node missing
     * @example
     * const hierarchy = strategy.buildHierarchy(blocksData);
     * // Returns D3 hierarchy node with layout coordinates
     */
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
    
    /**
     * Traces path through D3 hierarchy using encoded features.
     * 
     * @param {d3.HierarchyNode} hierarchyRoot - D3 hierarchy root
     * @param {Object} instance - Instance data with encoded features
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @example
     * const path = strategy.tracePath(hierarchyRoot, encodedInstance);
     */
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

            const goLeft = featureValue <= threshold;
            const parentData = currentNode.data;

            currentNode = currentNode.children?.find(child => {
                const childId = child.data.node_id;
                return goLeft
                    ? childId === parentData.left_child
                    : childId === parentData.right_child;
            });
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    /**
     * Finds node by ID in D3 hierarchy structure.
     * 
     * @param {d3.HierarchyNode} hierarchyRoot - D3 hierarchy root
     * @param {number} nodeId - Node ID to find
     * @returns {Object|null} Found node data or null
     */
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
    
    /**
     * Gets all paths from hierarchy root to leaves.
     * 
     * @param {d3.HierarchyNode} hierarchyRoot - D3 hierarchy root
     * @returns {Array<Array<number>>} All root-to-leaf paths
     */
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
    
    /**
     * Finds parent node for a given node ID.
     * 
     * @param {number} nodeId - Child node ID
     * @param {Map} nodeMap - Map of all nodes
     * @returns {Object|null} Parent node or null
     * @private
     */
    _findParent(nodeId, nodeMap) {
        for (const [, parentNode] of nodeMap) {
            if (parentNode.left_child === nodeId || parentNode.right_child === nodeId) {
                return parentNode;
            }
        }
        return null;
    }
}

/**
 * Spawn tree specific processing strategy.
 * Extends standard strategy with raw data traversal options.
 * 
 * @class
 * @extends StandardTreeProcessingStrategy
 * @example
 * const strategy = new SpawnTreeProcessingStrategy();
 * const path = strategy.tracePath(state, instance, true);
 */
class SpawnTreeProcessingStrategy extends StandardTreeProcessingStrategy {
    /**
     * Traces path with support for raw data traversal.
     * Handles different parameter patterns for backward compatibility.
     * 
     * @param {Object|TreeState} rootOrState - Root node or state object
     * @param {Object} instance - Instance data for path tracing
     * @param {boolean} [useRawData=false] - Whether to use raw data traversal
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @example
     * // Using hierarchy
     * const path1 = strategy.tracePath(hierarchyRoot, instance);
     * 
     * // Using raw data
     * const path2 = strategy.tracePath(state, instance, true);
     */
    tracePath(rootOrState, instance, useRawData = false) {
        let root, treeData;
        
        if (rootOrState && rootOrState.treeData) {
            root = rootOrState.hierarchyRoot;
            treeData = rootOrState.treeData;
        } else {
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
    
    /**
     * Traces path using raw tree data structure.
     * Provides alternative traversal method for spawn trees.
     * 
     * @param {Array<TreeNode>} treeData - Raw tree node data
     * @param {Object} instance - Instance data for path tracing
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @private
     * @example
     * // Internal usage only
     * const path = this._tracePathFromRawData(rawData, encodedInstance);
     */
    _tracePathFromRawData(treeData, instance) {
        const path = [];
        const nodesById = {};
        
        treeData.forEach(node => {
            nodesById[node.node_id] = node;
        });
        
        let currentNode = nodesById[0];
        
        while (currentNode && !currentNode.is_leaf) {
            path.push(currentNode.node_id);
            
            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const featureValue = instance[featureName];

            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in instance data`);
                break;
            }
            
            const goLeft = featureValue <= threshold;
            
            currentNode = goLeft ? 
                nodesById[currentNode.left_child] : 
                nodesById[currentNode.right_child];
        }
        
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }
        
        return path;
    }
}

/**
 * Main processor class that delegates to appropriate strategy.
 * Provides unified interface for all tree processing operations.
 * 
 * @class
 * @example
 * const processor = new TreeDataProcessor('classic');
 * const hierarchy = processor.createHierarchy(treeData);
 * const path = processor.findInstancePath(instance);
 */
class TreeDataProcessor {
    /**
     * Creates a new tree data processor for specified tree kind.
     * 
     * @param {string} treeKind - Type of tree ('classic', 'blocks', 'spawn')
     * @example
     * const processor = new TreeDataProcessor(TREES_SETTINGS.treeKindID.classic);
     */
    constructor(treeKind) {
        /**
         * Type of tree being processed
         * @type {string}
         */
        this.treeKind = treeKind;
        
        /**
         * Tree state for this processor
         * @type {TreeState}
         */
        this.state = getTreeState(treeKind);
        
        /**
         * Processing strategy for this tree type
         * @type {TreeProcessingStrategy}
         */
        this.strategy = this._getStrategy();
    }
    
    /**
     * Gets appropriate strategy for tree kind.
     * 
     * @returns {TreeProcessingStrategy} Strategy instance
     * @private
     */
    _getStrategy() {
        const strategies = {
            [TREES_SETTINGS.treeKindID.classic]: new StandardTreeProcessingStrategy(),
            [TREES_SETTINGS.treeKindID.spawn]: new SpawnTreeProcessingStrategy(), 
            [TREES_SETTINGS.treeKindID.blocks]: new BlocksTreeProcessingStrategy()
        };
        return strategies[this.treeKind] || new StandardTreeProcessingStrategy();
    }
    
    /**
     * Creates hierarchy from raw data and stores in state.
     * 
     * @param {Array<TreeNode>} data - Raw tree node data
     * @returns {Object} Created hierarchy root
     * @example
     * const hierarchy = processor.createHierarchy(rawTreeData);
     */
    createHierarchy(data) {
        this.state.treeData = data;
        this.state.hierarchyRoot = this.strategy.buildHierarchy(data);
        return this.state.hierarchyRoot;
    }
    
    /**
     * Finds instance path through tree.
     * 
     * @param {Object} [instance] - Instance data, uses state if not provided
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @example
     * const path = processor.findInstancePath(myInstance);
     */
    findInstancePath(instance) {
        const instanceData = instance || this.state.instanceData;
        return this.strategy.tracePath(this.state.hierarchyRoot, instanceData);
    }
    
    /**
     * Gets node by ID from hierarchy.
     * 
     * @param {number} nodeId - Node ID to find
     * @returns {Object|null} Found node or null
     * @example
     * const node = processor.getNodeById(5);
     */
    getNodeById(nodeId) {
        return this.strategy.findNode(this.state.hierarchyRoot, nodeId);
    }
    
    /**
     * Gets all root-to-leaf paths.
     * 
     * @returns {Array<Array<number>>} All paths through tree
     * @example
     * const allPaths = processor.getAllPaths();
     */
    getAllPaths() {
        return this.strategy.getAllPaths(this.state.hierarchyRoot);
    }
    
    /**
     * Checks if node is in instance path.
     * 
     * @param {number} nodeId - Node ID to check
     * @param {Array<number>} instancePath - Path to check
     * @returns {boolean} True if node is in path
     */
    isNodeInPath(nodeId, instancePath) {
        return this.strategy.isNodeInPath(nodeId, instancePath);
    }
    
    /**
     * Gets feature value from instance data.
     * 
     * @param {string} featureName - Feature name
     * @param {Object} instanceData - Instance data
     * @returns {*} Feature value
     */
    getInstanceValue(featureName, instanceData) {
        return this.strategy.getInstanceValue(featureName, instanceData);
    }
    
    /**
     * Spawn tree specific path tracing method.
     * 
     * @param {Object} instance - Instance data
     * @param {boolean} [useRawData=false] - Use raw data traversal
     * @returns {Array<number>} Path of node IDs
     */
    traceInstancePath(instance, useRawData = false) {
        if (this.treeKind === TREES_SETTINGS.treeKindID.spawn) {
            return this.strategy.tracePath(this.state, instance, useRawData);
        }
        return this.findInstancePath(instance);
    }
}

/**
 * Factory class for creating tree data processors.
 * Provides static methods for backward compatibility.
 * 
 * @class
 * @example
 * const processor = TreeDataProcessorFactory.create('classic');
 * const hierarchy = TreeDataProcessorFactory.createHierarchy('blocks');
 */
export class TreeDataProcessorFactory {
    /**
     * Creates a new tree data processor.
     * 
     * @static
     * @param {string} treeKind - Type of tree to process
     * @returns {TreeDataProcessor} New processor instance
     * @example
     * const processor = TreeDataProcessorFactory.create('classic');
     */
    static create(treeKind) {
        return new TreeDataProcessor(treeKind);
    }
    
    /**
     * Creates hierarchy for specified tree kind (backward compatibility).
     * 
     * @static
     * @param {string} treeKind - Type of tree
     * @returns {Object|null} Hierarchy root or null
     * @example
     * const hierarchy = TreeDataProcessorFactory.createHierarchy('blocks');
     */
    static createHierarchy(treeKind) {
        const processor = this.create(treeKind);
        const data = processor.state.treeData;
        if (!data) {
            console.error(`No tree data found in state for ${treeKind}`);
            return null;
        }
        return processor.strategy.buildHierarchy(data);
    }
    
    /**
     * Finds instance path (backward compatibility).
     * 
     * @static
     * @param {string} treeKind - Type of tree
     * @param {Object} [rootNode] - Root node or instance data
     * @param {Object} [instance] - Instance data
     * @returns {Array<number>} Path of node IDs
     * @example
     * const path = TreeDataProcessorFactory.findInstancePath('classic', root, instance);
     */
    static findInstancePath(treeKind, rootNode, instance) {
        const processor = this.create(treeKind);
        if (rootNode && instance) {
            return processor.strategy.tracePath(rootNode, instance);
        } else if (rootNode && !instance) {
            return processor.strategy.tracePath(processor.state.hierarchyRoot, rootNode);
        } else {
            return processor.strategy.tracePath(processor.state.hierarchyRoot, processor.state.instanceData);
        }
    }
    
    /**
     * Gets node by ID (backward compatibility).
     * 
     * @static
     * @param {string} treeKind - Type of tree
     * @param {number} nodeId - Node ID to find
     * @returns {Object|null} Found node or null
     */
    static getNodeById(treeKind, nodeId) {
        const processor = this.create(treeKind);
        return processor.strategy.findNode(processor.state.hierarchyRoot, nodeId);
    }
    
    /**
     * Gets all paths (backward compatibility).
     * 
     * @static
     * @param {string} treeKind - Type of tree
     * @returns {Array<Array<number>>} All paths
     */
    static getAllPaths(treeKind) {
        const processor = this.create(treeKind);
        return processor.strategy.getAllPaths(processor.state.hierarchyRoot);
    }
    
    /**
     * Traces instance path (backward compatibility).
     * 
     * @static
     * @param {string} treeKind - Type of tree
     * @param {Object} instance - Instance data
     * @returns {Array<number>} Path of node IDs
     */
    static traceInstancePath(treeKind, instance) {
        const processor = this.create(treeKind);
        if (processor.treeKind === TREES_SETTINGS.treeKindID.spawn) {
            return processor.strategy.tracePath(processor.state, instance, false);
        }
        return processor.strategy.tracePath(processor.state.hierarchyRoot, instance);
    }
}

// Backward compatibility function exports
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
