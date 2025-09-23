/**
 * @fileoverview Node rendering and interaction for TreeSpawn decision tree visualization.
 * Handles dual node styling (rectangles for path, circles for off-path), feature decoding, and interactive highlighting.
 * @author Generated documentation
 * @module NodeSpawnTree
 */

import {
    colorScheme,
    getNodeColor,
} from "../visualizationConnectorHelpers/colors.js";
import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { spawnTreeState } from "../TreesCommon/state.js";
import { createContextMenu } from "./contextMenu_spawnTree.js"
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { calculateFontSize, TREES_SETTINGS } from "../TreesCommon/settings.js";
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";

/**
 * @typedef {Object} SpawnNodeData
 * @property {Object} data - Node data object
 * @property {number} data.node_id - Unique node identifier
 * @property {boolean} data.is_leaf - Whether node is a leaf
 * @property {string} [data.feature_name] - Encoded feature name for split nodes
 * @property {number} [data.threshold] - Split threshold value
 * @property {number|string} [data.class_label] - Class label for leaf nodes
 * @property {boolean} [hasHiddenChildren] - Whether node has collapsed children
 * @property {boolean} [isExpanded] - Whether node subtree is expanded
 * @property {number} x - X coordinate position
 * @property {number} y - Y coordinate position
 */

/**
 * Generates human-readable text lines for spawn tree nodes.
 * Uses feature decoder to convert encoded features to original format for display.
 * 
 * @param {Object} nodeData - Node data (direct or wrapped in d3 hierarchy)
 * @param {Object} [featureMappingInfo=null] - Feature mapping information for decoding
 * @returns {Array<string>} Array of text lines for node display
 * @example
 * const lines = getSpawnNodeTextLines({
 *   is_leaf: false,
 *   feature_name: 'sepal_length_encoded',
 *   threshold: 5.5
 * }, mappingInfo);
 * // Returns: ['sepal_length ≤ 5.5']
 * 
 * @example
 * const leafLines = getSpawnNodeTextLines({
 *   is_leaf: true,
 *   class_label: 'setosa'
 * });
 * // Returns: ['setosa']
 * 
 * @see FeatureDecoder.decodeTreeSplitCondition
 */
function getSpawnNodeTextLines(nodeData, featureMappingInfo = null) {
    if (!nodeData) return ['Unknown Node'];

    const data = nodeData.data || nodeData;

    if (data.is_leaf) {
        return [data.class_label];
    }
    
    const encodedFeatureName = data.feature_name;
    const threshold = data.threshold;
    
    if (!encodedFeatureName || threshold === undefined) {
        return ['Internal Node'];
    }
    
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);
    
    try {
        const decodedCondition = decoder.decodeTreeSplitCondition(encodedFeatureName, threshold, true);
        return [decodedCondition];
        
    } catch (error) {
        console.warn("Error decoding node text for spawn tree:", error);
        
        const thresholdStr = Number.isFinite(threshold) ? threshold.toFixed(1) : threshold;
        return [`${encodedFeatureName} ≤ ${thresholdStr}`];
    }
}

/**
 * Gets node text lines using current global feature mapping information.
 * Convenience wrapper that uses global feature mapping state.
 * 
 * @param {Object} nodeData - Node data object
 * @returns {Array<string>} Array of text lines for display
 * @example
 * const lines = getNodeTextLines(nodeData);
 * // Uses window.currentFeatureMappingInfo automatically
 */
function getNodeTextLines(nodeData) {
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    return getSpawnNodeTextLines(nodeData, featureMappingInfo);
}

/**
 * Checks if node is in the instance path using tree data processor.
 * Uses the centralized tree processor for consistent path checking logic.
 * 
 * @param {number} nodeId - Node ID to check
 * @param {Array<number>} instancePath - Path of node IDs
 * @returns {boolean} True if node is in the instance path
 * @example
 * const inPath = isNodeInPath(5, [0, 1, 5, 12]);
 * // Returns: true (node 5 is in the path)
 * 
 * @see TreeDataProcessorFactory.create
 */
function isNodeInPath(nodeId, instancePath) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.spawn);
    return processor.isNodeInPath(nodeId, instancePath);
}

/**
 * Adds interactive nodes to the TreeSpawn visualization.
 * Creates dual styling (rectangles for path nodes, circles for off-path) with tooltips and context menus.
 * 
 * @param {d3.Selection} contentGroup - D3 container selection for node elements
 * @param {Object} treeData - Tree hierarchy data with node information
 * @param {Object} metrics - Layout metrics for sizing and positioning
 * @param {Object} tooltip - Tooltip object for hover interactions
 * @param {Object} colorMap - Color mapping for consistent node styling
 * @returns {d3.Selection} D3 selection of created node groups
 * @example
 * const nodes = addNodes(contentGroup, treeData, metrics, tooltip, colorMap);
 * // Creates all visible nodes with appropriate styling and interactions
 * 
 * @example
 * // Nodes with path styling
 * addNodes(svgGroup, hierarchyData, layoutMetrics, tooltipInstance, colors);
 * // Path nodes get rectangles, off-path nodes get circles
 * 
 * @see createContextMenu
 * @see handleNodeClick
 * @see getNodeTextLines
 */
export function addNodes(
    contentGroup,
    treeData,
    metrics,
    tooltip,
    colorMap
) {
    const instancePath = spawnTreeState.instancePath || [];
    const instanceData = spawnTreeState.instanceData;
    
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    
    const visibleNodes = treeData.descendants().filter(d => !d.isHidden);
    
    const nodes = contentGroup
        .selectAll(".node")
        .data(visibleNodes, d => d.data.node_id)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes.each(function(d) {
        const isInPath = isNodeInPath(d.data.node_id, instancePath);
        const element = d3.select(this);
        
        element.selectAll('*').remove();
        
        if (isInPath) {
            element.append("rect")
                .attr("x", -TREES_SETTINGS.visual.rectWidth / 2)
                .attr("y", -TREES_SETTINGS.visual.rectHeight / 2)
                .attr("width", TREES_SETTINGS.visual.rectWidth)
                .attr("height", TREES_SETTINGS.visual.rectHeight)
                .attr("rx", TREES_SETTINGS.visual.rectBorderRadius)
                .attr("ry", TREES_SETTINGS.visual.rectBorderRadius)
                .attr("data-original-stroke-width", metrics.nodeBorderStrokeWidth)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);

            const textLines = getNodeTextLines(d);
            const fontSize = calculateFontSize(textLines);
            const lineHeight = fontSize * 1.2;
            
            const totalTextHeight = textLines.length * lineHeight;
            const startY = -(totalTextHeight / 2) + (lineHeight / 2);
            
            textLines.forEach((line, index) => {
                const yPos = startY + (index * lineHeight);
                
                element.append("text")
                    .attr("x", 0)
                    .attr("y", yPos)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", `${fontSize}px`)
                    .text(line);
            });
        } else {
            element.append("circle")
                .attr("r", metrics.nodeRadius)
                .attr("data-original-stroke-width", metrics.nodeBorderStrokeWidth)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);
            
            if (d.hasHiddenChildren) {
                element.append("text")
                    .attr("x", 0)
                    .attr("y", 5)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", "12px")
                    .style("font-weight", "bold")
                    .style("fill", "#333")
                    .style("pointer-events", "none")
                    .text("...");
            }
        }
    });

    nodes.selectAll("circle, rect")
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, TREES_SETTINGS.treeKindID.spawn, featureMappingInfo)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", () =>
            handleMouseOut(tooltip)
        )
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        })
        .on("contextmenu", (event, d) => {
            if (d.hasHiddenChildren || d.isExpanded) {
                createContextMenu(event, d, contentGroup, treeData, metrics, tooltip, colorMap);
            }
        });

    return nodes;
}

/**
 * Handles node click events for highlighting coordination.
 * Integrates with the central highlighting system to coordinate across all visualizations.
 * 
 * @param {MouseEvent} event - Click event object
 * @param {SpawnNodeData} spawnNodeData - Spawn tree node data
 * @example
 * // Called automatically from node click handlers
 * handleNodeClick(clickEvent, nodeData);
 * // Triggers highlighting across all tree and scatter plot visualizations
 * 
 * @see coordinateHighlightingAcrossAllTrees
 */
function handleNodeClick(event, spawnNodeData) {
    event.stopPropagation();

    const nodeId = spawnNodeData.data.node_id;
    const isLeaf = spawnNodeData.data.is_leaf;

    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'spawn');
}
