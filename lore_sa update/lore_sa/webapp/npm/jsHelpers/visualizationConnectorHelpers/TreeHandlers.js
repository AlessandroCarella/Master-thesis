/**
 * @fileoverview Tree-specific highlighting handlers using strategy pattern.
 * Provides specialized highlighting logic for different tree visualization types with encoded feature support.
 * @author Generated documentation
 * @module TreeHandlers
 */

import { colorScheme } from "./colors.js";
import { getTreeState } from "../TreesCommon/state.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

/**
 * @typedef {Object} VisualizationObject
 * @property {d3.Selection} [contentGroup] - D3 selection for classic trees
 * @property {d3.Selection} [container] - D3 selection for blocks/spawn trees
 * @property {d3.HierarchyNode} [treeData] - Tree hierarchy data
 * @property {Object} [metrics] - Layout metrics and dimensions
 * @property {Array} [rawTreeData] - Raw tree data structure
 * @property {Array} [allPaths] - All root-to-leaf paths
 */

/**
 * @typedef {Object} TreeState
 * @property {Array} treeData - Raw tree node data
 * @property {Object} instanceData - Instance data for path tracing
 * @property {Object} hierarchyRoot - Processed hierarchy root
 * @property {Array} [instancePath] - Cached instance path
 */

/**
 * Base handler class for tree visualization highlighting operations.
 * Defines common interface that all tree handlers must implement.
 * 
 * @abstract
 * @class
 * @example
 * // Extended by specific tree handlers
 * class MyTreeHandler extends BaseTreeHandler {
 *   highlightNode(nodeId) { }
 * }
 */
class BaseTreeHandler {
    /**
     * Creates a new base tree handler.
     * 
     * @param {VisualizationObject} visualization - Visualization object with D3 elements
     * @param {string} treeKind - Type of tree ('classic', 'blocks', 'spawn')
     * @example
     * const handler = new BaseTreeHandler(visualization, 'classic');
     */
    constructor(visualization, treeKind) {
        /**
         * Visualization object containing D3 elements
         * @type {VisualizationObject}
         */
        this.visualization = visualization;
        
        /**
         * Type of tree visualization
         * @type {string}
         */
        this.treeKind = treeKind;
        
        /**
         * Tree state for this handler
         * @type {TreeState}
         */
        this.state = getTreeState(treeKind);
    }

    /**
     * Highlights a specific node in the visualization.
     * 
     * @abstract
     * @param {string|number} nodeId - ID of node to highlight
     * @throws {Error} Must be implemented by subclasses
     */
    highlightNode(nodeId) { 
        throw new Error('Must implement highlightNode'); 
    }
    
    /**
     * Highlights a path of nodes in the visualization.
     * 
     * @abstract
     * @param {Array<number>} pathNodeIds - Array of node IDs forming a path
     * @throws {Error} Must be implemented by subclasses
     */
    highlightPath(pathNodeIds) { 
        throw new Error('Must implement highlightPath'); 
    }
    
    /**
     * Highlights all descendants of a node.
     * 
     * @abstract
     * @param {string|number} nodeId - ID of parent node
     * @throws {Error} Must be implemented by subclasses
     */
    highlightDescendants(nodeId) { 
        throw new Error('Must implement highlightDescendants'); 
    }
    
    /**
     * Resets all highlights in the visualization.
     * 
     * @abstract
     * @throws {Error} Must be implemented by subclasses
     */
    resetHighlights() { 
        throw new Error('Must implement resetHighlights'); 
    }
    
    /**
     * Finds path through tree for given encoded features.
     * 
     * @abstract
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs
     * @throws {Error} Must be implemented by subclasses
     */
    findPath(features) { 
        throw new Error('Must implement findPath'); 
    }
    
    /**
     * Gets node by ID from visualization structure.
     * 
     * @abstract
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} Found node or null
     * @throws {Error} Must be implemented by subclasses
     */
    getNodeById(nodeId) { 
        throw new Error('Must implement getNodeById'); 
    }
    
    /**
     * Highlights instance path with persistent background.
     * 
     * @abstract
     * @param {Array<number>} instancePath - Path to highlight
     * @throws {Error} Must be implemented by subclasses
     */
    highlightInstancePath(instancePath) { 
        throw new Error('Must implement highlightInstancePath'); 
    }
}

/**
 * Handler for classic tree visualization highlighting.
 * Manages node and link highlighting with D3 selections and tree hierarchy.
 * 
 * @class
 * @extends BaseTreeHandler
 * @example
 * const handler = new ClassicTreeHandler(visualization, 'classic');
 * handler.highlightNode(5);
 * handler.highlightPath([0, 1, 5]);
 */
export class ClassicTreeHandler extends BaseTreeHandler {
    /**
     * Highlights a single node by applying highlight styling.
     * 
     * @param {string|number} nodeId - ID of node to highlight
     * @example
     * handler.highlightNode(5);
     * // Node 5 gets highlighted border
     */
    highlightNode(nodeId) {
        if (!this.visualization?.contentGroup) return;
        
        this.visualization.contentGroup
            .selectAll(".node")
            .filter(d => d.data.node_id === nodeId)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${this.visualization.metrics.nodeBorderStrokeWidth}px`);
    }
    
    /**
     * Highlights a path of nodes and connecting links.
     * 
     * @param {Array<number>} pathNodeIds - Array of node IDs forming the path
     * @example
     * handler.highlightPath([0, 1, 3, 7]);
     * // Highlights nodes and links in sequence
     */
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    /**
     * Highlights a node and all its descendants recursively.
     * 
     * @param {string|number} nodeId - ID of parent node
     * @example
     * handler.highlightDescendants(3);
     * // Highlights node 3 and all its children/grandchildren
     */
    highlightDescendants(nodeId) {
        const node = this.getNodeById(nodeId);
        if (!node) return;
        
        this._highlightDescendantsRecursive(node);
    }
    
    /**
     * Recursively highlights descendants of a node.
     * 
     * @param {Object} node - Tree node with D3 hierarchy structure
     * @private
     */
    _highlightDescendantsRecursive(node) {
        this.highlightNode(node.data.node_id);
        
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                this._highlightLink(node.data.node_id, child.data.node_id);
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    /**
     * Resets all highlighting to original styling.
     * 
     * @example
     * handler.resetHighlights();
     * // All nodes and links return to default styling
     */
    resetHighlights() {
        if (!this.visualization?.contentGroup) return;
        
        this.visualization.contentGroup
            .selectAll(".node circle")
            .style("stroke", colorScheme.ui.nodeStroke)
            .style("stroke-width", `${this.visualization.metrics.nodeBorderStrokeWidth}px`);
        
        this.visualization.contentGroup
            .selectAll(".link")
            .style("stroke", function(d) {
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            })
            .style("stroke-width", function(d) {
                return `${d3.select(this).attr("data-original-stroke-width")}px`;
            });
    }
    
    /**
     * Finds path through tree using encoded feature values.
     * Traverses tree following decision splits based on feature thresholds.
     * 
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs from root to leaf
     * @example
     * const path = handler.findPath({
     *   feature1_encoded: 1.0,
     *   feature2_cat_A: 1
     * });
     * // Returns: [0, 1, 3] (root -> internal -> leaf)
     */
    findPath(features) {
        if (!this.visualization?.treeData) return [];
        
        const path = [];
        const root = this.visualization.treeData.descendants().find(d => d.depth === 0);
        let currentNode = root;

        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = shouldGoLeft ?
                currentNode.children?.find(c => c.data.node_id === currentNode.data.left_child) :
                currentNode.children?.find(c => c.data.node_id === currentNode.data.right_child);
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    /**
     * Gets node by ID from tree hierarchy.
     * 
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} D3 hierarchy node or null
     * @example
     * const node = handler.getNodeById(5);
     * if (node) {
     *   console.log('Node data:', node.data);
     * }
     */
    getNodeById(nodeId) {
        if (!this.visualization?.treeData) return null;
        
        return this.visualization.treeData.descendants().find(d => d.data.node_id === nodeId);
    }
    
    /**
     * Highlights a link between two nodes.
     * 
     * @param {string|number} sourceId - Source node ID
     * @param {string|number} targetId - Target node ID
     * @private
     */
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.contentGroup) return;
        
        this.visualization.contentGroup
            .selectAll(".link")
            .filter(d => d.source.data.node_id === sourceId && d.target.data.node_id === targetId)
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    /**
     * Highlights instance path with persistent background highlighting.
     * Creates permanent visual indicators for the explained instance's path through the tree.
     * 
     * @param {Array<number>} instancePath - Path of node IDs to highlight
     * @example
     * handler.highlightInstancePath([0, 1, 3, 7]);
     * // Creates persistent background highlights for instance path
     */
    highlightInstancePath(instancePath) {
        if (!this.visualization?.contentGroup || !instancePath || instancePath.length < 2) return;

        const { contentGroup } = this.visualization;
        
        contentGroup
            .selectAll(".link.instance-path")
            .classed("instance-path", false);
        contentGroup.selectAll(".link-highlight").remove();

        const linkPairs = instancePath.slice(0, -1).map((source, i) => ({
            source,
            target: instancePath[i + 1],
        }));

        contentGroup
            .selectAll(".link")
            .filter((d) => {
                const sourceId = d.source.data.node_id;
                const targetId = d.target.data.node_id;
                return linkPairs.some(pair => pair.source === sourceId && pair.target === targetId);
            })
            .each(function () {
                const originalPath = d3.select(this);
                const pathD = originalPath.attr("d");
                const baseStrokeWidth = parseFloat(originalPath.attr("data-original-stroke-width"));

                contentGroup
                    .append("path")
                    .attr("class", "link-highlight instance-path-highlight")
                    .attr("d", pathD)
                    .style("stroke", colorScheme.ui.instancePathHighlight)
                    .style("stroke-width", `${baseStrokeWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                    .style("fill", "none")
                    .style("opacity", colorScheme.opacity.originalInstancePath)
                    .lower();

                originalPath.classed("instance-path", true);
            });
    }
}

/**
 * Handler for blocks tree visualization highlighting.
 * Manages rectangular node layout highlighting and link coordination.
 * 
 * @class
 * @extends BaseTreeHandler
 * @example
 * const handler = new BlocksTreeHandler(visualization, 'blocks');
 * handler.highlightNode(8);
 */
export class BlocksTreeHandler extends BaseTreeHandler {
    /**
     * Highlights a single block node.
     * 
     * @param {string|number} nodeId - ID of node to highlight
     * @example
     * handler.highlightNode(8);
     * // Block node 8 gets highlighted border
     */
    highlightNode(nodeId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .filter(d => d.id === nodeId)
            .style("stroke", colorScheme.ui.highlight);
    }
    
    /**
     * Highlights a path of block nodes and connections.
     * 
     * @param {Array<number>} pathNodeIds - Array of node IDs forming the path
     * @example
     * handler.highlightPath([0, 2, 5]);
     * // Highlights blocks and connecting lines
     */
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    /**
     * Highlights descendants using hierarchy structure.
     * 
     * @param {string|number} nodeId - ID of parent node
     * @example
     * handler.highlightDescendants(2);
     * // Highlights block 2 and all its descendant blocks
     */
    highlightDescendants(nodeId) {
        const hierarchyNode = this._findHierarchyNode(nodeId);
        if (!hierarchyNode) return;
        
        this._highlightDescendantsRecursive(hierarchyNode);
    }
    
    /**
     * Recursively highlights descendants in hierarchy.
     * 
     * @param {Object} hierarchyNode - D3 hierarchy node
     * @private
     */
    _highlightDescendantsRecursive(hierarchyNode) {
        this.highlightNode(hierarchyNode.data.node_id);
        
        if (hierarchyNode.children && hierarchyNode.children.length > 0) {
            hierarchyNode.children.forEach(child => {
                this._highlightLink(hierarchyNode.data.node_id, child.data.node_id);
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    /**
     * Finds hierarchy node by ID.
     * 
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} Hierarchy node or null
     * @private
     */
    _findHierarchyNode(nodeId) {
        const root = this.state.hierarchyRoot;
        if (!root) return null;

        function search(node) {
            if (node.data.node_id === nodeId) return node;
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
     * Resets all block highlighting.
     * 
     * @example
     * handler.resetHighlights();
     * // All blocks return to default styling
     */
    resetHighlights() {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .style("stroke", colorScheme.ui.nodeStroke);
        
        this.visualization.container
            .selectAll(".link")
            .style("stroke", function(d) {
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            })
            .style("stroke-width", function(d) {
                return `${d3.select(this).attr("data-original-stroke-width")}px`;
            });
    }
    
    /**
     * Finds path through blocks tree using encoded features.
     * 
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs
     * @example
     * const path = handler.findPath(encodedFeatures);
     */
    findPath(features) {
        const root = this.state.hierarchyRoot;
        if (!root) return [];

        const path = [];
        let currentNode = root;

        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = currentNode.children?.find(child =>
                shouldGoLeft ?
                    child.data.node_id === currentNode.data.left_child :
                    child.data.node_id === currentNode.data.right_child
            );
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    /**
     * Gets node data by ID from hierarchy.
     * 
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} Node data or null
     */
    getNodeById(nodeId) {
        const root = this.state.hierarchyRoot;
        if (!root) return null;

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
        return search(root);
    }
    
    /**
     * Highlights link between two blocks.
     * 
     * @param {string|number} sourceId - Source node ID
     * @param {string|number} targetId - Target node ID
     * @private
     */
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".link")
            .filter(d => (d.sourceId === sourceId && d.targetId === targetId) ||
                        (d.sourceId === targetId && d.targetId === sourceId))
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    /**
     * Highlights instance path for blocks tree.
     * 
     * @param {Array<number>} instancePath - Path to highlight
     * @example
     * handler.highlightInstancePath([0, 2, 5, 10]);
     */
    highlightInstancePath(instancePath) {
        if (!this.visualization?.container || !instancePath || instancePath.length < 2) return;

        const { container } = this.visualization;
        
        container
            .selectAll(".link.instance-path")
            .classed("instance-path", false);
        container.selectAll(".link-highlight").remove();

        if (!instancePath || instancePath.length < 2) return;

        const linkPairs = instancePath.slice(0, -1).map((source, i) => ({
            source,
            target: instancePath[i + 1],
        }));

        container
            .selectAll(".link")
            .filter((d) => {
                const sourceId = d.sourceId;
                const targetId = d.targetId;
                return linkPairs.some(pair => pair.source === sourceId && pair.target === targetId);
            })
            .each(function () {
                const originalLink = d3.select(this);
                const x1 = originalLink.attr("x1");
                const y1 = originalLink.attr("y1");
                const x2 = originalLink.attr("x2");
                const y2 = originalLink.attr("y2");
                
                container
                    .append("line")
                    .attr("class", "link-highlight instance-path-highlight")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("stroke", colorScheme.ui.instancePathHighlight)
                    .style("opacity", colorScheme.opacity.originalInstancePath)
                    .style("stroke-width", `${d3.select(this).attr("data-original-stroke-width") * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                    .lower();

                originalLink.classed("instance-path", true);
            });
    }
}

/**
 * Handler for TreeSpawn visualization highlighting.
 * Manages spawn-style tree layout with advanced path finding capabilities.
 * 
 * @class
 * @extends BaseTreeHandler
 * @example
 * const handler = new TreeSpawnHandler(visualization, 'spawn');
 * handler.highlightDescendants(4);
 */
export class TreeSpawnHandler extends BaseTreeHandler {
    /**
     * Highlights a single spawn tree node.
     * 
     * @param {string|number} nodeId - ID of node to highlight
     * @example
     * handler.highlightNode(12);
     * // Spawn node 12 gets highlighted styling
     */
    highlightNode(nodeId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .filter(d => d.data?.node_id === nodeId)
            .selectAll("circle, rect")
            .style("stroke", colorScheme.ui.highlight);
    }
    
    /**
     * Highlights path in spawn tree.
     * 
     * @param {Array<number>} pathNodeIds - Array of node IDs forming the path
     * @example
     * handler.highlightPath([0, 3, 8, 15]);
     */
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    /**
     * Highlights descendants using tree data structure or raw data fallback.
     * 
     * @param {string|number} nodeId - ID of parent node
     * @example
     * handler.highlightDescendants(4);
     * // Highlights node 4 and all spawned descendants
     */
    highlightDescendants(nodeId) {
        if (this.visualization?.treeData) {
            const treeNode = this._findTreeDataNode(nodeId);
            if (treeNode) {
                this._highlightDescendantsRecursive(treeNode);
                return;
            }
        }
        
        const rawNode = this.getNodeById(nodeId);
        if (rawNode) {
            this._highlightDescendantsFromRawData(rawNode);
        }
    }
    
    /**
     * Recursively highlights descendants from tree data.
     * 
     * @param {Object} treeNode - Tree node with hierarchy structure
     * @private
     */
    _highlightDescendantsRecursive(treeNode) {
        this.highlightNode(treeNode.data.node_id);
        
        if (treeNode.children && treeNode.children.length > 0) {
            treeNode.children.forEach(child => {
                this._highlightLink(treeNode.data.node_id, child.data.node_id);
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    /**
     * Highlights descendants using raw data structure.
     * 
     * @param {Object} rawNode - Raw tree node data
     * @private
     */
    _highlightDescendantsFromRawData(rawNode) {
        this.highlightNode(rawNode.node_id);
        
        if (!rawNode.is_leaf && this.state.treeData) {
            const children = this.state.treeData.filter(node => 
                node.node_id === rawNode.left_child || node.node_id === rawNode.right_child
            );
            
            children.forEach(child => {
                this._highlightLink(rawNode.node_id, child.node_id);
                this._highlightDescendantsFromRawData(child);
            });
        }
    }
    
    /**
     * Finds tree data node by ID.
     * 
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} Tree data node or null
     * @private
     */
    _findTreeDataNode(nodeId) {
        if (!this.visualization?.treeData) return null;
        
        function search(node) {
            if (node.data.node_id === nodeId) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
            }
            return null;
        }
        
        const root = this.visualization.treeData.descendants().find(d => d.depth === 0);
        return root ? search(root) : null;
    }
    
    /**
     * Resets all spawn tree highlighting.
     * 
     * @example
     * handler.resetHighlights();
     * // All spawn nodes return to default styling
     */
    resetHighlights() {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .selectAll("circle, rect")
            .style("stroke", colorScheme.ui.nodeStroke);
        
        this.visualization.container
            .selectAll(".link")
            .style("stroke", function(d) {
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            });
    }
    
    /**
     * Finds path through spawn tree with multiple fallback methods.
     * Uses raw data traversal, hierarchy, or cached instance path.
     * 
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs
     * @example
     * const path = handler.findPath({
     *   feature1_encoded: 0.8,
     *   feature2_cat_B: 1
     * });
     * // Returns most reliable path found
     */
    findPath(features) {
        if (this.state.treeData && Array.isArray(this.state.treeData)) {
            const path = this._traverseFromRawData(features);
            if (path.length > 0) {
                return path;
            }
        }
        
        if (this.state.hierarchyRoot) {
            const path = this._traverseFromHierarchy(features);
            if (path.length > 0) {
                return path;
            }
        }
        
        if (this.state.instancePath?.length > 0) {
            return [...this.state.instancePath];
        }
        
        console.warn("TreeSpawnHandler: No path found, returning empty array");
        return [];
    }
    
    /**
     * Enhanced raw data traversal using encoded features.
     * 
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs
     * @private
     */
    _traverseFromRawData(features) {
        if (!this.state.treeData || !Array.isArray(this.state.treeData)) {
            console.warn("TreeSpawnHandler: No raw tree data available");
            return [];
        }
        
        const nodesById = {};
        this.state.treeData.forEach(node => {
            nodesById[node.node_id] = node;
        });
        
        const path = [];
        let currentNode = nodesById[0];
        
        while (currentNode && !currentNode.is_leaf) {
            path.push(currentNode.node_id);
            
            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            const nextNodeId = shouldGoLeft ? currentNode.left_child : currentNode.right_child;
            currentNode = nodesById[nextNodeId];
            
            if (!currentNode) {
                console.warn(`TreeSpawnHandler: Could not find next node with ID ${nextNodeId}`);
                break;
            }
        }
        
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }
        
        return path;
    }
    
    /**
     * Hierarchy traversal method using encoded features.
     * 
     * @param {Object} features - Encoded feature values
     * @returns {Array<number>} Path of node IDs
     * @private
     */
    _traverseFromHierarchy(features) {
        if (!this.state.hierarchyRoot) return [];
        
        const path = [];
        let currentNode = this.state.hierarchyRoot;
        
        if (currentNode.descendants) {
            currentNode = currentNode.descendants().find(d => d.depth === 0);
        }
        
        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = currentNode.children?.find(child =>
                shouldGoLeft ?
                    child.data.node_id === currentNode.data.left_child :
                    child.data.node_id === currentNode.data.right_child
            );
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    /**
     * Gets node by ID from raw tree data.
     * 
     * @param {string|number} nodeId - Node ID to find
     * @returns {Object|null} Raw node data or null
     */
    getNodeById(nodeId) {
        if (!this.state.treeData) return null;
        return this.state.treeData.find(node => node.node_id === nodeId);
    }
    
    /**
     * Highlights link between spawn tree nodes.
     * 
     * @param {string|number} sourceId - Source node ID
     * @param {string|number} targetId - Target node ID
     * @private
     */
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".link")
            .filter(d => (d.source.data.node_id === sourceId && d.target.data.node_id === targetId) ||
                        (d.source.data.node_id === targetId && d.target.data.node_id === sourceId))
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    /**
     * Highlights instance path with persistent background for spawn tree.
     * 
     * @param {Array<number>} instancePath - Path to highlight
     * @example
     * handler.highlightInstancePath([0, 3, 7, 14]);
     */
    highlightInstancePath(instancePath) {
        if (!this.visualization || !instancePath || instancePath.length === 0) return;

        this._addInstancePathBackgroundDirect(instancePath);
    }

    /**
     * Adds persistent background highlights for spawn tree instance path.
     * 
     * @param {Array<number>} instancePath - Path to highlight
     * @private
     */
    _addInstancePathBackgroundDirect(instancePath) {
        if (!this.visualization.container || !this.visualization.treeData || !this.visualization.metrics) {
            console.warn("TreeSpawn visualization not properly initialized, cannot add instance path background");
            return;
        }
        
        const { container, treeData, metrics } = this.visualization;
        
        container.selectAll(".instance-path-background").remove();
        
        if (!instancePath || instancePath.length === 0) return;
        
        const visibleLinks = treeData.links().filter(link => 
            !link.source.isHidden && !link.target.isHidden
        );
        
        const instancePathLinks = visibleLinks.filter(link => {
            const sourceId = link.source.data.node_id;
            const targetId = link.target.data.node_id;
            
            for (let i = 0; i < instancePath.length - 1; i++) {
                if (instancePath[i] === sourceId && instancePath[i + 1] === targetId) {
                    return true;
                }
            }
            return false;
        });
        
        container
            .selectAll(".instance-path-background")
            .data(instancePathLinks)
            .join("path")
            .attr("class", "instance-path-background instance-path-highlight")
            .attr("data-source-id", (d) => d.source.data.node_id)
            .attr("data-target-id", (d) => d.target.data.node_id)
            .each(function(d) {
                const ratio = (d.target.data.weighted_n_samples || d.target.data.n_samples) / treeData.data.n_samples;
                const originalStrokeWidth = ratio * 3 * metrics.linkStrokeWidth;
                d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
            })
            .style("stroke-width", function(d) {
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`;
            })
            .attr("d", (d) => {
                const { x: sourceX, y: sourceY } = d.source;
                const { x: targetX, y: targetY } = d.target;
                return `M${sourceX},${sourceY} L${targetX},${targetY}`;
            })
            .style("fill", "none")
            .style("stroke", colorScheme.ui.instancePathHighlight)
            .style("opacity", colorScheme.opacity.originalInstancePath)
            .lower();
    }
}

/**
 * Factory class for creating tree handlers.
 * Uses factory pattern to instantiate appropriate handler for tree type.
 * 
 * @class
 * @example
 * const handler = TreeHandlerFactory.create('classic', visualization);
 * handler.highlightNode(5);
 */
export class TreeHandlerFactory {
    /**
     * Creates appropriate handler for the specified tree kind.
     * 
     * @static
     * @param {string} treeKind - Type of tree ('classic', 'blocks', 'spawn')
     * @param {VisualizationObject} visualization - Visualization object
     * @returns {BaseTreeHandler} Appropriate tree handler instance
     * @throws {Error} When unknown tree kind is provided
     * @example
     * const classicHandler = TreeHandlerFactory.create('classic', classicViz);
     * const blocksHandler = TreeHandlerFactory.create('blocks', blocksViz);
     * const spawnHandler = TreeHandlerFactory.create('spawn', spawnViz);
     */
    static create(treeKind, visualization) {
        switch (treeKind) {
            case TREES_SETTINGS.treeKindID.classic:
                return new ClassicTreeHandler(visualization, treeKind);
            case TREES_SETTINGS.treeKindID.blocks:
                return new BlocksTreeHandler(visualization, treeKind);
            case TREES_SETTINGS.treeKindID.spawn:
                return new TreeSpawnHandler(visualization, treeKind);
            default:
                throw new Error(`Unknown tree kind: ${treeKind}`);
        }
    }
}
