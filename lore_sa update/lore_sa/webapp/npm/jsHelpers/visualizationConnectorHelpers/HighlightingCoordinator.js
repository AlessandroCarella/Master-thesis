/**
 * @fileoverview Central coordination system for highlighting across all visualization types.
 * Manages cross-visualization interactions, instance path highlighting, and synchronized node selection.
 * @author Generated documentation
 * @module HighlightingCoordinator
 */

import { TreeHandlerFactory } from "./TreeHandlers.js";
import { ScatterPlotHighlighter } from "./ScatterPlotHighlighter.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

/**
 * @typedef {Object} VisualizationHandler
 * @property {string} treeKind - Type of tree visualization
 * @property {Function} findPath - Finds path through tree for given features
 * @property {Function} highlightPath - Highlights path in visualization
 * @property {Function} highlightNode - Highlights single node
 * @property {Function} highlightDescendants - Highlights node descendants
 * @property {Function} resetHighlights - Clears all highlights
 * @property {Function} highlightInstancePath - Highlights instance path
 */

/**
 * Central coordinator for highlighting interactions across all visualizations.
 * Manages synchronized highlighting between trees and scatter plots, handles instance path coordination.
 * 
 * @class
 * @example
 * const coordinator = new HighlightingCoordinator();
 * coordinator.registerTreeHandler('classic', classicTreeViz);
 * coordinator.coordinateHighlighting(nodeId, true);
 */
class HighlightingCoordinator {
    /**
     * Creates a new highlighting coordinator instance.
     * Initializes empty handler collections and state tracking.
     */
    constructor() {
        /**
         * Map of registered tree handlers by tree kind
         * @type {Map<string, VisualizationHandler>}
         * @private
         */
        this.treeHandlers = new Map();
        
        /**
         * Scatter plot highlighter instance
         * @type {ScatterPlotHighlighter|null}
         * @private
         */
        this.scatterPlotHighlighter = null;
        
        /**
         * Currently selected node ID
         * @type {string|number|null}
         * @private
         */
        this.selectedNode = null;
        
        /**
         * Currently explained instance data
         * @type {Object|null}
         * @private
         */
        this.explainedInstance = null;
    }
    
    /**
     * Registers a tree handler for coordinated highlighting.
     * Automatically applies instance path highlighting if an explained instance exists.
     * 
     * @param {string} treeKind - Type of tree visualization
     * @param {Object} visualization - Visualization object to register
     * @example
     * coordinator.registerTreeHandler('classic', {
     *   contentGroup: d3Selection,
     *   treeData: hierarchyData,
     *   metrics: layoutMetrics
     * });
     * 
     * @see TreeHandlerFactory.create
     */
    registerTreeHandler(treeKind, visualization) {
        const handler = TreeHandlerFactory.create(treeKind, visualization);
        this.treeHandlers.set(treeKind, handler);
        
        const explainedInstance = this.getExplainedInstance();
        if (explainedInstance) {
            this._applyInstancePathHighlighting(handler, explainedInstance);
        }
    }
    
    /**
     * Sets the explained instance and applies path highlighting to all registered trees.
     * 
     * @param {Object} instance - Instance data for path highlighting
     * @example
     * coordinator.setExplainedInstance({
     *   feature1_encoded: 1.0,
     *   feature2_cat_A: 1
     * });
     * 
     * @see _applyInstancePathHighlighting
     */
    setExplainedInstance(instance) {
        this.explainedInstance = instance;
        
        if (instance) {
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, instance);
            });
        }
    }
    
    /**
     * Gets the currently explained instance data.
     * 
     * @returns {Object|null} Current explained instance or null
     * @example
     * const instance = coordinator.getExplainedInstance();
     * if (instance) {
     *   console.log('Current instance features:', Object.keys(instance));
     * }
     */
    getExplainedInstance() {
        return this.explainedInstance;
    }
    
    /**
     * Applies instance path highlighting to a specific handler.
     * 
     * @param {VisualizationHandler} handler - Tree handler to apply highlighting to
     * @param {Object} instance - Instance data for path calculation
     * @private
     * @example
     * // Internal usage only
     * this._applyInstancePathHighlighting(classicHandler, instanceData);
     */
    _applyInstancePathHighlighting(handler, instance) {
        try {
            const path = handler.findPath(instance);
            if (path.length > 1) {
                handler.highlightInstancePath(path);
            }
        } catch (error) {
            console.warn(`Error applying instance path highlighting for ${handler.treeKind}:`, error);
        }
    }
    
    /**
     * Registers scatter plot highlighter for coordinated interactions.
     * 
     * @param {Object} scatterPlotVisualization - Scatter plot visualization object
     * @example
     * coordinator.registerScatterPlotHighlighter({
     *   data: scatterData,
     *   points: d3Selection
     * });
     * 
     * @see ScatterPlotHighlighter
     */
    registerScatterPlotHighlighter(scatterPlotVisualization) {
        this.scatterPlotHighlighter = new ScatterPlotHighlighter(scatterPlotVisualization);
    }
    
    /**
     * Sets the boolean array for original points neighborhood filtering.
     * 
     * @param {Array<boolean>} array - Boolean array indicating neighborhood membership
     * @example
     * coordinator.setOriginalPointsNeighPointsBoolArray([true, false, true, true]);
     */
    setOriginalPointsNeighPointsBoolArray(array) {
        if (this.scatterPlotHighlighter) {
            this.scatterPlotHighlighter.setOriginalPointsNeighPointsBoolArray(array);
        }
    }
    
    /**
     * Gets neighborhood membership status for a specific point index.
     * 
     * @param {number} index - Point index to check
     * @returns {boolean} True if point is in neighborhood, false otherwise
     * @example
     * const isInNeighborhood = coordinator.getOriginalPointsNeighPointsBoolArrayValAti(5);
     */
    getOriginalPointsNeighPointsBoolArrayValAti(index) {
        return this.scatterPlotHighlighter?.getOriginalPointsNeighPointsBoolArrayValAti(index) ?? true;
    }
    
    /**
     * Coordinates highlighting across all registered visualizations.
     * Handles node selection, deselection, and synchronized highlighting.
     * 
     * @param {string|number} nodeId - ID of node to highlight
     * @param {boolean} isLeaf - Whether the node is a leaf node
     * @param {string} [sourceTreeType=null] - Type of tree that initiated the highlighting
     * @example
     * // Highlight leaf node across all visualizations
     * coordinator.coordinateHighlighting(15, true, 'classic');
     * 
     * // Highlight split node and its descendants
     * coordinator.coordinateHighlighting(8, false, 'blocks');
     * 
     * @see _highlightLeafAcrossAllTrees
     * @see _highlightSplitNodeAcrossAllTrees
     */
    coordinateHighlighting(nodeId, isLeaf, sourceTreeType = null) {
        if (this.selectedNode === nodeId) {
            this.resetAllHighlights();
            this.selectedNode = null;
            return;
        }

        this.resetAllHighlights();
        this.selectedNode = nodeId;

        if (isLeaf) {
            this._highlightLeafAcrossAllTrees(nodeId);
        } else {
            this._highlightSplitNodeAcrossAllTrees(nodeId);
        }
    }
    
    /**
     * Resets all interactive highlights while preserving instance path highlights.
     * Automatically reapplies instance path highlighting after reset.
     * 
     * @example
     * coordinator.resetAllHighlights();
     * // All interactive highlights cleared, instance paths preserved
     */
    resetAllHighlights() {
        this.treeHandlers.forEach(handler => {
            handler.resetHighlights();
        });
        this.scatterPlotHighlighter?.resetHighlights();
        this.selectedNode = null;
        
        if (this.explainedInstance) {
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, this.explainedInstance);
            });
        }
    }
    
    /**
     * Clears instance path highlighting from all trees.
     * Removes persistent background highlights for instance paths.
     * 
     * @example
     * coordinator.clearInstancePathHighlighting();
     * // All instance path highlights removed
     */
    clearInstancePathHighlighting() {
        this.treeHandlers.forEach(handler => {
            try {
                if (handler.visualization?.contentGroup) {
                    handler.visualization.contentGroup.selectAll(".link-highlight").remove();
                    handler.visualization.contentGroup
                        .selectAll(".link.instance-path")
                        .classed("instance-path", false);
                } else if (handler.visualization?.container) {
                    handler.visualization.container.selectAll(".link-highlight").remove();
                    handler.visualization.container.selectAll(".instance-path-background").remove();
                    handler.visualization.container
                        .selectAll(".link.instance-path")
                        .classed("instance-path", false);
                }
            } catch (error) {
                console.warn(`Error clearing instance path highlighting for ${handler.treeKind}:`, error);
            }
        });
    }
    
    /**
     * Refreshes instance path highlighting for all trees.
     * Clears existing highlights and reapplies them with current instance.
     * 
     * @example
     * coordinator.refreshInstancePathHighlighting();
     * // Instance paths cleared and reapplied
     */
    refreshInstancePathHighlighting() {
        if (this.explainedInstance) {
            this.clearInstancePathHighlighting();
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, this.explainedInstance);
            });
        }
    }
    
    /**
     * Highlights instance paths across all registered trees.
     * 
     * @param {Object} instance - Instance data for path calculation
     * @example
     * coordinator.highlightInstancePaths({
     *   feature1: 1.0,
     *   feature2_encoded: 0.5
     * });
     */
    highlightInstancePaths(instance) {
        if (!instance) return;
        
        this.treeHandlers.forEach((handler, treeKind) => {
            try {
                const path = handler.findPath(instance);
                if (path.length > 0) {
                    handler.highlightPath(path);
                }
            } catch (error) {
                console.warn(`Error highlighting instance path for ${treeKind}:`, error);
            }
        });
    }
    
    /**
     * Highlights a leaf node across all tree visualizations.
     * 
     * @param {string|number} nodeId - ID of leaf node to highlight
     * @private
     * @example
     * // Internal usage only
     * this._highlightLeafAcrossAllTrees(15);
     */
    _highlightLeafAcrossAllTrees(nodeId) {
        this.treeHandlers.forEach(handler => {
            try {
                const pathToNode = this._getPathToNode(nodeId, handler);
                if (pathToNode.length > 0) {
                    handler.highlightPath(pathToNode);
                } else {
                    handler.highlightNode(nodeId);
                }
            } catch (error) {
                console.warn(`Error highlighting leaf in tree:`, error);
            }
        });
        
        if (this.scatterPlotHighlighter) {
            const rawTreeData = this._getRawTreeData();
            if (rawTreeData) {
                this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
            }
        }
    }
    
    /**
     * Highlights a split node and its descendants across all tree visualizations.
     * 
     * @param {string|number} nodeId - ID of split node to highlight
     * @private
     * @example
     * // Internal usage only
     * this._highlightSplitNodeAcrossAllTrees(8);
     */
    _highlightSplitNodeAcrossAllTrees(nodeId) {
        this.treeHandlers.forEach(handler => {
            try {
                const pathToNode = this._getPathToNode(nodeId, handler);
                if (pathToNode.length > 0) {
                    handler.highlightPath(pathToNode);
                }
                handler.highlightDescendants(nodeId);
            } catch (error) {
                console.warn(`Error highlighting split node in tree:`, error);
            }
        });
        
        if (this.scatterPlotHighlighter) {
            const rawTreeData = this._getRawTreeData();
            if (rawTreeData) {
                this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
            }
        }
    }
    
    /**
     * Gets the path from root to a specific node for a given handler.
     * 
     * @param {string|number} nodeId - Target node ID
     * @param {VisualizationHandler} handler - Tree handler to search
     * @returns {Array} Path from root to node
     * @private
     * @example
     * // Internal usage only
     * const path = this._getPathToNode(15, classicHandler);
     */
    _getPathToNode(nodeId, handler) {
        try {
            if (handler.treeKind === TREES_SETTINGS.treeKindID.classic) {
                return this._getClassicTreePathToNode(nodeId, handler);
            } else if (handler.treeKind === TREES_SETTINGS.treeKindID.blocks) {
                return this._getBlocksTreePathToNode(nodeId, handler);
            } else if (handler.treeKind === TREES_SETTINGS.treeKindID.spawn) {
                return this._getSpawnTreePathToNode(nodeId, handler);
            }
        } catch (error) {
            console.warn(`Error getting path to node ${nodeId}:`, error);
        }
        return [];
    }
    
    /**
     * Gets path to node in classic tree structure.
     * 
     * @param {string|number} nodeId - Target node ID
     * @param {VisualizationHandler} handler - Classic tree handler
     * @returns {Array} Path from root to node
     * @private
     */
    _getClassicTreePathToNode(nodeId, handler) {
        const node = handler.getNodeById(nodeId);
        if (!node) return [];
        
        const path = [];
        let current = node;
        while (current) {
            path.unshift(current.data.node_id);
            current = current.parent;
        }
        return path;
    }
    
    /**
     * Gets path to node in blocks tree structure.
     * 
     * @param {string|number} nodeId - Target node ID
     * @param {VisualizationHandler} handler - Blocks tree handler
     * @returns {Array} Path from root to node
     * @private
     */
    _getBlocksTreePathToNode(nodeId, handler) {
        const allPaths = handler.visualization?.allPaths || [];
        
        for (const path of allPaths) {
            const nodeIndex = path.indexOf(nodeId);
            if (nodeIndex !== -1) {
                return path.slice(0, nodeIndex + 1);
            }
        }
        
        return [];
    }
    
    /**
     * Gets path to node in spawn tree structure.
     * 
     * @param {string|number} nodeId - Target node ID
     * @param {VisualizationHandler} handler - Spawn tree handler
     * @returns {Array} Path from root to node
     * @private
     */
    _getSpawnTreePathToNode(nodeId, handler) {
        if (handler.state.instancePath?.includes(nodeId)) {
            const nodeIndex = handler.state.instancePath.indexOf(nodeId);
            return handler.state.instancePath.slice(0, nodeIndex + 1);
        }
        
        if (!handler.state.treeData) return [];

        const nodesById = {};
        handler.state.treeData.forEach(node => {
            nodesById[node.node_id] = node;
        });
        
        function findPath(currentNodeId, targetNodeId, path = []) {
            const newPath = [...path, currentNodeId];
            
            if (currentNodeId === targetNodeId) {
                return newPath;
            }
            
            const currentNode = nodesById[currentNodeId];
            if (!currentNode || currentNode.is_leaf) {
                return null;
            }
            
            if (currentNode.left_child !== null) {
                const leftPath = findPath(currentNode.left_child, targetNodeId, newPath);
                if (leftPath) return leftPath;
            }
            
            if (currentNode.right_child !== null) {
                const rightPath = findPath(currentNode.right_child, targetNodeId, newPath);
                if (rightPath) return rightPath;
            }
            
            return null;
        }
        
        return findPath(0, nodeId) || [];
    }
    
    /**
     * Gets raw tree data from any available handler.
     * 
     * @returns {Array|null} Raw tree data or null if not available
     * @private
     * @example
     * // Internal usage only
     * const rawData = this._getRawTreeData();
     */
    _getRawTreeData() {
        for (const [treeKind, handler] of this.treeHandlers) {
            if (handler.visualization?.rawTreeData) {
                return handler.visualization.rawTreeData;
            }
            if (handler.state?.treeData) {
                return handler.state.treeData;
            }
        }
        return null;
    }
    
    /**
     * Legacy compatibility method for highlighting points for a leaf node.
     * 
     * @param {Object} leafNode - Legacy leaf node object
     * @param {Object} scatterPlotVis - Scatter plot visualization
     * @deprecated Use coordinateHighlighting instead
     * @example
     * coordinator.highlightPointsForLeaf(leafNode, scatterViz);
     */
    highlightPointsForLeaf(leafNode, scatterPlotVis) {
        if (this.scatterPlotHighlighter && scatterPlotVis) {
            const nodeId = leafNode?.data?.node_id;
            if (nodeId) {
                const rawTreeData = this._getRawTreeData();
                if (rawTreeData) {
                    this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
                }
            }
        }
    }
    
    /**
     * Legacy compatibility method for highlighting points for descendants.
     * 
     * @param {Object} node - Legacy node object
     * @param {Object} scatterPlotVis - Scatter plot visualization
     * @deprecated Use coordinateHighlighting instead
     * @example
     * coordinator.highlightPointsForDescendants(node, scatterViz);
     */
    highlightPointsForDescendants(node, scatterPlotVis) {
        if (this.scatterPlotHighlighter && scatterPlotVis) {
            const nodeId = node?.data?.node_id;
            if (nodeId) {
                const rawTreeData = this._getRawTreeData();
                if (rawTreeData) {
                    this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
                }
            }
        }
    }
}

/**
 * Singleton instance of the highlighting coordinator
 * @type {HighlightingCoordinator}
 */
export const highlightingCoordinator = new HighlightingCoordinator();

/**
 * Convenience function for coordinating highlighting across all trees.
 * 
 * @param {string|number} nodeId - Node ID to highlight
 * @param {boolean} isLeaf - Whether node is a leaf
 * @param {string} sourceTreeType - Type of source tree
 * @example
 * coordinateHighlightingAcrossAllTrees(15, true, 'classic');
 * 
 * @see highlightingCoordinator.coordinateHighlighting
 */
export function coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, sourceTreeType) {
    highlightingCoordinator.coordinateHighlighting(nodeId, isLeaf, sourceTreeType);
}

/**
 * Sets the neighborhood boolean array for scatter plot filtering.
 * 
 * @param {Array<boolean>} array - Boolean array for neighborhood filtering
 * @example
 * setOriginalPointsNeighPointsBoolArray([true, false, true]);
 * 
 * @see highlightingCoordinator.setOriginalPointsNeighPointsBoolArray
 */
export function setOriginalPointsNeighPointsBoolArray(array) {
    highlightingCoordinator.setOriginalPointsNeighPointsBoolArray(array);
}

/**
 * Registers a classic tree visualization with the coordinator.
 * 
 * @param {Object} visualization - Classic tree visualization object
 * @example
 * registerClassicTree({
 *   contentGroup: d3Selection,
 *   treeData: hierarchyData,
 *   metrics: layoutMetrics
 * });
 * 
 * @see highlightingCoordinator.registerTreeHandler
 */
export function registerClassicTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.classic, visualization);
}

/**
 * Registers a blocks tree visualization with the coordinator.
 * 
 * @param {Object} visualization - Blocks tree visualization object
 * @example
 * registerBlocksTree(blocksTreeVisualization);
 * 
 * @see highlightingCoordinator.registerTreeHandler
 */
export function registerBlocksTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.blocks, visualization);
}

/**
 * Registers a spawn tree visualization with the coordinator.
 * 
 * @param {Object} visualization - Spawn tree visualization object
 * @example
 * registerSpawnTree(spawnTreeVisualization);
 * 
 * @see highlightingCoordinator.registerTreeHandler
 */
export function registerSpawnTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.spawn, visualization);
}

/**
 * Registers a scatter plot visualization with the coordinator.
 * 
 * @param {Object} visualization - Scatter plot visualization object
 * @example
 * registerScatterPlot({
 *   data: scatterData,
 *   points: d3Selection
 * });
 * 
 * @see highlightingCoordinator.registerScatterPlotHighlighter
 */
export function registerScatterPlot(visualization) {
    highlightingCoordinator.registerScatterPlotHighlighter(visualization);
}

/**
 * Highlights instance paths for all registered trees.
 * 
 * @param {Object} instance - Instance data for path highlighting
 * @example
 * highlightInstancePathsForAllTrees({
 *   feature1_encoded: 1.0,
 *   feature2_cat_A: 1
 * });
 * 
 * @see highlightingCoordinator.setExplainedInstance
 */
export function highlightInstancePathsForAllTrees(instance) {
    highlightingCoordinator.setExplainedInstance(instance);
}
