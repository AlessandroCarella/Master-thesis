/**
 * @fileoverview Scatter plot highlighting system for coordinated tree-scatter interactions.
 * Works exclusively with encoded features for proper point filtering and highlighting based on tree node selections.
 * @author Generated documentation
 * @module ScatterPlotHighlighter
 */

import { colorScheme } from "./colors.js";
import { getGlobalColorMap } from "./colors.js";

/**
 * @typedef {Object} ScatterPlotVisualization
 * @property {Object} data - Scatter plot data
 * @property {Array<Array<number>>} data.transformedData - Transformed coordinates
 * @property {Array<number>} data.targets - Class labels
 * @property {Array<Object>} data.originalData - Original data points
 * @property {d3.Selection} points - D3 selection of scatter plot points
 */

/**
 * Handles highlighting interactions for scatter plot visualizations.
 * Coordinates with tree visualizations to highlight relevant data points based on tree node selections.
 * 
 * @class
 * @example
 * const highlighter = new ScatterPlotHighlighter({
 *   data: scatterData,
 *   points: d3Selection
 * });
 * highlighter.highlightPointsForNode(nodeId, rawTreeData);
 */
export class ScatterPlotHighlighter {
    /**
     * Creates a new scatter plot highlighter instance.
     * 
     * @param {ScatterPlotVisualization} scatterPlotVisualization - Scatter plot visualization object
     * @example
     * const highlighter = new ScatterPlotHighlighter({
     *   data: { transformedData: [...], targets: [...], originalData: [...] },
     *   points: d3.selectAll('.scatter-point')
     * });
     */
    constructor(scatterPlotVisualization) {
        /**
         * Reference to the scatter plot visualization
         * @type {ScatterPlotVisualization}
         * @private
         */
        this.visualization = scatterPlotVisualization;
        
        /**
         * Boolean array indicating neighborhood membership for points
         * @type {Array<boolean>|null}
         * @private
         */
        this.originalPointsNeighPointsBoolArray = null;
    }
    
    /**
     * Sets the boolean array for neighborhood point filtering.
     * Used to distinguish between original dataset points and neighborhood points.
     * 
     * @param {Array<boolean>} array - Boolean array where true indicates neighborhood membership
     * @example
     * highlighter.setOriginalPointsNeighPointsBoolArray([true, false, true, false]);
     * // Points 0 and 2 are in neighborhood, 1 and 3 are not
     */
    setOriginalPointsNeighPointsBoolArray(array) {
        this.originalPointsNeighPointsBoolArray = array;
    }
    
    /**
     * Gets neighborhood membership status for a specific point index.
     * 
     * @param {number} index - Index of point to check
     * @returns {boolean} True if point is in neighborhood, defaults to true if array not set
     * @example
     * const isInNeighborhood = highlighter.getOriginalPointsNeighPointsBoolArrayValAti(5);
     * if (isInNeighborhood) {
     *   // Point is part of the neighborhood
     * }
     */
    getOriginalPointsNeighPointsBoolArrayValAti(index) {
        return this.originalPointsNeighPointsBoolArray?.[index] ?? true;
    }
    
    /**
     * Highlights points associated with a specific tree node.
     * Handles both leaf nodes and split nodes with descendants.
     * 
     * @param {string|number} nodeId - ID of the tree node
     * @param {Array<Object>} rawTreeData - Raw tree data for node lookup
     * @example
     * highlighter.highlightPointsForNode(15, treeData);
     * // Highlights all points that belong to node 15
     * 
     * @see _highlightPointsForLeaf
     * @see _highlightPointsForDescendants
     */
    highlightPointsForNode(nodeId, rawTreeData) {
        if (!this.visualization?.points || !rawTreeData) return;
        
        const targetNode = rawTreeData.find(node => node.node_id === nodeId);
        if (!targetNode) return;
        
        if (targetNode.is_leaf) {
            this._highlightPointsForLeaf(nodeId, rawTreeData);
        } else {
            this._highlightPointsForDescendants(nodeId, rawTreeData);
        }
    }
    
    /**
     * Resets all highlighting and restores original point colors and opacities.
     * Maintains neighborhood-based opacity differences if array is set.
     * 
     * @example
     * highlighter.resetHighlights();
     * // All points return to original colors and opacities
     * 
     * @see getGlobalColorMap
     */
    resetHighlights() {
        if (!this.visualization?.points) return;
        
        const globalColorMap = getGlobalColorMap();
        
        if (!globalColorMap) {
            this.visualization.points
                .style("fill", null)
                .style("opacity", null);
            return;
        }
        
        this.visualization.points
            .style("fill", (d, i) => globalColorMap[this.visualization.data.targets[i]])
            .style("opacity", (d, i) => 
                this.getOriginalPointsNeighPointsBoolArrayValAti(i) ? 
                    colorScheme.opacity.datasetPoint : 
                    colorScheme.opacity.neighPoint
            );
    }
    
    /**
     * Highlights points that belong to a specific leaf node.
     * Uses encoded features to determine point membership through tree path traversal.
     * 
     * @param {string|number} nodeId - ID of the leaf node
     * @param {Array<Object>} rawTreeData - Raw tree data for path building
     * @private
     * @example
     * // Internal usage only
     * this._highlightPointsForLeaf(15, treeData);
     * 
     * @see _pointBelongsToNode
     */
    _highlightPointsForLeaf(nodeId, rawTreeData) {
        this.visualization.points
            .style("fill", (d, i) => {
                const originalData = this.visualization.data.originalData[i];
                const belongs = this._pointBelongsToNode(originalData, nodeId, rawTreeData);
                return belongs ? 
                    colorScheme.ui.highlight : 
                    getGlobalColorMap()[this.visualization.data.targets[i]];
            });
    }
    
    /**
     * Highlights points that belong to descendants of a split node.
     * Finds all leaf descendants and highlights points belonging to any of them.
     * 
     * @param {string|number} nodeId - ID of the split node
     * @param {Array<Object>} rawTreeData - Raw tree data for descendant lookup
     * @private
     * @example
     * // Internal usage only
     * this._highlightPointsForDescendants(8, treeData);
     * 
     * @see _getDescendantNodeIds
     * @see _pointBelongsToNode
     */
    _highlightPointsForDescendants(nodeId, rawTreeData) {
        const descendantIds = this._getDescendantNodeIds(nodeId, rawTreeData);
        const leafDescendantIds = descendantIds.filter(id => {
            const node = rawTreeData.find(n => n.node_id === id);
            return node?.is_leaf;
        });
        
        this.visualization.points
            .style("fill", (d, i) => {
                const originalData = this.visualization.data.originalData[i];
                
                for (const leafId of leafDescendantIds) {
                    if (this._pointBelongsToNode(originalData, leafId, rawTreeData)) {
                        return colorScheme.ui.highlight;
                    }
                }
                
                return getGlobalColorMap()[this.visualization.data.targets[i]];
            });
    }
    
    /**
     * Determines if a data point belongs to a specific tree node.
     * Uses encoded features and tree path traversal to check membership.
     * 
     * @param {Object} originalData - Encoded data point to check
     * @param {string|number} nodeId - ID of tree node to check against
     * @param {Array<Object>} rawTreeData - Raw tree data for path building
     * @returns {boolean} True if point belongs to the node
     * @private
     * @example
     * // Internal usage only
     * const belongs = this._pointBelongsToNode(encodedPoint, 15, treeData);
     * 
     * @see _buildPathToNode
     */
    _pointBelongsToNode(originalData, nodeId, rawTreeData) {
        const pathToNode = this._buildPathToNode(nodeId, rawTreeData);
        
        if (pathToNode.length === 0) {
            console.warn("No path found to node:", nodeId);
            return false;
        }

        if (pathToNode.length === 1 && nodeId === 0) {
            return true;
        }

        for (let i = 0; i < pathToNode.length - 1; i++) {
            const currentNode = pathToNode[i];
            const nextNode = pathToNode[i + 1];
            
            if (!currentNode.feature_name) {
                continue;
            }

            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const wentLeft = nextNode.node_id === currentNode.left_child;
            
            const featureValue = originalData[featureName];
            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in original data for node ${nodeId}:`, originalData);
                return false;
            }
            
            const shouldGoLeft = featureValue <= threshold;

            if (wentLeft !== shouldGoLeft) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Builds the path from root to a target node.
     * Creates a sequence of tree nodes that lead to the target.
     * 
     * @param {string|number} targetNodeId - ID of target node
     * @param {Array<Object>} rawTreeData - Raw tree data for path construction
     * @returns {Array<Object>} Array of tree nodes from root to target
     * @private
     * @example
     * // Internal usage only
     * const path = this._buildPathToNode(15, treeData);
     * // Returns: [rootNode, intermediateNode, targetNode]
     */
    _buildPathToNode(targetNodeId, rawTreeData) {
        if (!rawTreeData || !Array.isArray(rawTreeData)) {
            console.warn("Invalid raw tree data for path building");
            return [];
        }
        
        const nodeMap = {};
        rawTreeData.forEach(node => {
            nodeMap[node.node_id] = node;
        });
        
        const path = [];
        
        function findPathRecursive(currentNodeId, targetId, currentPath) {
            const node = nodeMap[currentNodeId];
            if (!node) return false;
            
            const newPath = [...currentPath, node];
            
            if (currentNodeId === targetId) {
                path.splice(0, path.length, ...newPath);
                return true;
            }
            
            if (node.left_child !== null && findPathRecursive(node.left_child, targetId, newPath)) {
                return true;
            }
            
            if (node.right_child !== null && findPathRecursive(node.right_child, targetId, newPath)) {
                return true;
            }
            
            return false;
        }
        
        findPathRecursive(0, targetNodeId, []);
        return path;
    }
    
    /**
     * Gets all descendant node IDs for a given node.
     * Recursively traverses the tree to collect all child nodes.
     * 
     * @param {string|number} nodeId - ID of parent node
     * @param {Array<Object>} rawTreeData - Raw tree data for traversal
     * @returns {Array<number>} Array of descendant node IDs
     * @private
     * @example
     * // Internal usage only
     * const descendants = this._getDescendantNodeIds(8, treeData);
     * // Returns: [8, 9, 10, 15, 16] (including the node itself)
     */
    _getDescendantNodeIds(nodeId, rawTreeData) {
        if (!rawTreeData || !Array.isArray(rawTreeData)) return [];
        
        const nodeMap = {};
        rawTreeData.forEach(node => {
            nodeMap[node.node_id] = node;
        });
        
        const descendants = [];
        
        function collectDescendants(currentNodeId) {
            const node = nodeMap[currentNodeId];
            if (!node) return;
            
            descendants.push(currentNodeId);
            
            if (node.left_child !== null) {
                collectDescendants(node.left_child);
            }
            if (node.right_child !== null) {
                collectDescendants(node.right_child);
            }
        }
        
        collectDescendants(nodeId);
        return descendants;
    }
}
