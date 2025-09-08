/**
 * @fileoverview Node rendering and interaction for classic hierarchical decision tree visualization.
 * Creates circular nodes with color-coded classes, tooltips, and coordinated highlighting across visualizations.
 * @author Generated documentation
 * @module NodeClassicTree
 */

import { colorScheme, getNodeColor } from "../visualizationConnectorHelpers/colors.js";
import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

/**
 * @typedef {Object} ClassicTreeNode
 * @property {Object} data - Node data object
 * @property {number} data.node_id - Unique node identifier
 * @property {boolean} data.is_leaf - Whether node is a leaf
 * @property {string} [data.feature_name] - Feature name for split nodes
 * @property {number} [data.threshold] - Split threshold value
 * @property {number|string} [data.class_label] - Class label for leaf nodes
 * @property {number} x - X coordinate position
 * @property {number} y - Y coordinate position
 */

/**
 * Adds interactive circular nodes to the classic tree visualization.
 * Creates nodes with appropriate sizing, coloring based on class labels, tooltips, and click handlers.
 * 
 * @param {d3.Selection} contentGroup - D3 container selection for node elements
 * @param {d3.HierarchyNode} treeData - D3 hierarchy data with node information
 * @param {Object} metrics - Layout metrics for sizing and stroke width
 * @param {Object} tooltip - Tooltip object for hover interactions
 * @param {Object} colorMap - Color mapping for consistent node styling
 * @returns {d3.Selection} D3 selection of created node groups
 * @example
 * const nodes = addNodes(contentGroup, hierarchyData, metrics, tooltip, colorMap);
 * // Creates all nodes with proper styling and interactions
 * 
 * @example
 * // Nodes with class-based coloring
 * addNodes(svgGroup, treeData, layoutMetrics, tooltipInstance, classColors);
 * // Leaf nodes get class colors, split nodes get default color
 * 
 * @see getNodeColor
 * @see handleNodeClick
 * @see handleMouseOver
 */
export function addNodes(contentGroup, treeData, metrics, tooltip, colorMap) {
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
        .append("circle")
        .attr("r", (d) => metrics.nodeRadius)
        .style("fill", (d) => getNodeColor(d, colorMap))
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("stroke", colorScheme.ui.nodeStroke)
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, TREES_SETTINGS.treeKindID.classic, featureMappingInfo)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(tooltip)
        )
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        });

    return nodes;
}

/**
 * Handles node click events for highlighting coordination.
 * Integrates with the central highlighting system to coordinate across all visualizations.
 * 
 * @param {MouseEvent} event - Click event object
 * @param {ClassicTreeNode} d - Classic tree node data
 * @example
 * // Called automatically from node click handlers
 * handleNodeClick(clickEvent, nodeData);
 * // Triggers highlighting across all tree and scatter plot visualizations
 * 
 * @see coordinateHighlightingAcrossAllTrees
 */
function handleNodeClick(event, d) {
    event.stopPropagation();

    const nodeId = d.data.node_id;
    const isLeaf = d.data.is_leaf;

    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'classic');
}
