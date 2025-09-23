/**
 * @fileoverview Node rendering and interaction for blocks-style decision tree visualization.
 * Creates rectangular nodes with feature decoding, multi-line labels, and coordinated highlighting across visualizations.
 * @author Generated documentation
 * @module NodeBlocksTree
 */

import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { colorScheme, getGlobalColorMap, getNodeColor } from "../visualizationConnectorHelpers/colors.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { calculateFontSize, TREES_SETTINGS } from "../TreesCommon/settings.js";
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";
import { calculateMetrics } from "../TreesCommon/metrics.js";

/**
 * @typedef {Object} BlocksNodeData
 * @property {number} id - Node identifier
 * @property {number} x - X coordinate position
 * @property {number} y - Y coordinate position
 * @property {string} label - Node display label
 */

/**
 * Generates human-readable label lines for blocks tree nodes.
 * Uses feature decoder to convert encoded features back to original format for display.
 * 
 * @param {number} nodeId - Node ID to generate labels for
 * @param {Object} [featureMappingInfo=null] - Feature mapping information for decoding
 * @returns {Array<string>} Array of label lines for node display
 * @example
 * const lines = getBlocksNodeLabelLines(5, mappingInfo);
 * // Returns: ['species = setosa'] for categorical feature
 * 
 * @example
 * const leafLines = getBlocksNodeLabelLines(leafNodeId);
 * // Returns: ['class_0'] for leaf node
 * 
 * @see FeatureDecoder.decodeTreeSplitCondition
 * @see TreeDataProcessorFactory.create
 */
function getBlocksNodeLabelLines(nodeId, featureMappingInfo = null) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const node = processor.getNodeById(nodeId);
    
    if (!node) return [`Node ${nodeId}`];
    
    if (node.is_leaf) {
        return [node.class_label];
    }
    
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);
    
    try {
        const encodedFeatureName = node.feature_name;
        const threshold = Number(node.threshold) ?? 0;
        
        const decodedCondition = decoder.decodeTreeSplitCondition(encodedFeatureName, threshold, true);
        return [decodedCondition];
        
    } catch (error) {
        console.warn("Error decoding node label for blocks tree:", error);
        
        const threshold = Number(node.threshold) ?? 0;
        const thresholdStr = Number.isFinite(threshold) ? threshold.toFixed(1) : threshold;
        return [`${node.feature_name} ≤ ${thresholdStr}`];
    }
}

/**
 * Gets node label lines using current global feature mapping information.
 * Convenience wrapper that uses global feature mapping state.
 * 
 * @param {number} nodeId - Node ID to generate labels for
 * @returns {Array<string>} Array of label lines for display
 * @example
 * const lines = getNodeLabelLines(nodeId);
 * // Uses window.currentFeatureMappingInfo automatically
 */
export function getNodeLabelLines(nodeId) {
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    return getBlocksNodeLabelLines(nodeId, featureMappingInfo);
}

/**
 * Gets appropriate color for blocks tree nodes using global color management.
 * Integrates with global color scheme for consistent visualization styling.
 * 
 * @param {number} nodeId - Node ID to get color for
 * @returns {string} CSS color value for the node
 * @example
 * const color = getBlocksNodeColor(leafNodeId);
 * // Returns appropriate class color for leaf nodes
 * 
 * @example
 * const splitColor = getBlocksNodeColor(splitNodeId);
 * // Returns default color for decision nodes
 * 
 * @see getGlobalColorMap
 * @see getNodeColor
 * @see TreeDataProcessorFactory.create
 */
function getBlocksNodeColor(nodeId) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const nodeData = processor.getNodeById(nodeId);
    if (!nodeData) return colorScheme.ui.nodeStroke;
    
    const globalColorMap = getGlobalColorMap();
    if (!globalColorMap) return colorScheme.ui.nodeStroke;
    
    const nodeForColorFunction = {
        data: nodeData
    };
    
    return getNodeColor(nodeForColorFunction, globalColorMap);
}

/**
 * Renders interactive rectangular nodes for blocks tree visualization.
 * Creates nodes with appropriate sizing, coloring, tooltips, and click handlers.
 * 
 * @param {d3.Selection} container - D3 container selection for node elements
 * @param {Object<number, BlocksNodeData>} nodePositions - Mapping of node IDs to position data
 * @param {Array<number>} instancePath - Instance path for highlighting
 * @param {Object} tooltip - Tooltip object for hover interactions
 * @returns {d3.Selection} D3 selection of rendered node elements
 * @example
 * const nodeElements = renderNodes(container, nodePositions, [0, 1, 3], tooltip);
 * // Creates all nodes with proper styling and interactions
 * 
 * @example
 * // Nodes with instance path highlighting
 * renderNodes(svgContainer, positions, instancePath, tooltipInstance);
 * // Instance path nodes get highlighted class
 * 
 * @see getBlocksNodeColor
 * @see handleNodeClick
 * @see TREES_SETTINGS.node
 */
export function renderNodes(container, nodePositions, instancePath, tooltip, metrics) {
    const nodes = Object.values(nodePositions);
    
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    const nodeElements = container
        .selectAll(".node")
        .data(nodes)
        .enter()
        .append("rect")
        .attr(
            "class",
            (d) => `node ${instancePath.includes(d.id) ? "highlighted" : ""}`
        )
        .attr("x", (d) => d.x - TREES_SETTINGS.node.width / 2)
        .attr("y", (d) => d.y - TREES_SETTINGS.node.height / 2)
        .attr("width", TREES_SETTINGS.node.width)
        .attr("height", TREES_SETTINGS.node.height)
        .attr("rx", TREES_SETTINGS.node.borderRadius)
        .attr("ry", TREES_SETTINGS.node.borderRadius)
        .attr("fill", (d) => getBlocksNodeColor(d.id))
        .attr("data-original-stroke-width", metrics?.nodeStrokeWidth || TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth)
        .style("stroke-width", `${metrics?.nodeStrokeWidth || TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth}px`)
        .on("mouseover", (event, d) => {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const nodeData = processor.getNodeById(d.id);
            handleMouseOver(event, nodeData, tooltip, TREES_SETTINGS.treeKindID.blocks, featureMappingInfo);
        })
        .on("mousemove", (event) => {
            handleMouseMove(event, tooltip);
        })
        .on("mouseout", (event, d) => {
            handleMouseOut(tooltip);
        })
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        });

    return nodeElements;
}

/**
 * Renders multi-line text labels for blocks tree nodes.
 * Creates properly positioned and sized text with optimal font sizing for readability.
 * 
 * @param {d3.Selection} container - D3 container selection for label elements
 * @param {Object<number, BlocksNodeData>} nodePositions - Mapping of node IDs to position data
 * @example
 * renderLabels(container, nodePositions);
 * // Creates text labels for all nodes with optimal sizing
 * 
 * @example
 * // Multi-line labels with proper spacing
 * renderLabels(svgContainer, positions);
 * // Each line positioned correctly within node bounds
 * 
 * @see getNodeLabelLines
 * @see calculateFontSize
 */
export function renderLabels(container, nodePositions) {
    const nodes = Object.values(nodePositions);

    container
        .selectAll(".node-label-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-label-group")
        .each(function (d) {
            const group = d3.select(this);
            const lines = getNodeLabelLines(d.id);
            const fontSize = calculateFontSize(lines);
            const lineHeight = fontSize * 1.2;

            lines.forEach((line, idx) => {
                group
                    .append("text")
                    .attr("class", "node-label")
                    .attr("x", d.x)
                    .attr(
                        "y",
                        d.y + (idx - (lines.length - 1) / 2) * lineHeight
                    )
                    .style("font-size", `${fontSize}px`)
                    .text(line);
            });
        });
}

/**
 * Handles node click events for highlighting coordination.
 * Integrates with the central highlighting system to coordinate across all visualizations.
 * 
 * @param {MouseEvent} event - Click event object
 * @param {BlocksNodeData} blocksNodeData - Blocks tree node data
 * @example
 * // Called automatically from node click handlers
 * handleNodeClick(clickEvent, nodeData);
 * // Triggers highlighting across all tree and scatter plot visualizations
 * 
 * @see coordinateHighlightingAcrossAllTrees
 * @see TreeDataProcessorFactory.create
 */
function handleNodeClick(event, blocksNodeData) {
    event.stopPropagation();

    const nodeId = blocksNodeData.id;
    
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const nodeData = processor.getNodeById(nodeId);
    const isLeaf = nodeData ? nodeData.is_leaf : false;

    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'blocks');
}
