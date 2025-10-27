/**
 * @fileoverview Link creation and rendering for classic hierarchical decision tree visualization.
 * Handles curved link paths, decision branch coloring, and persistent instance path highlighting with interactive tooltips.
 * @author Generated documentation
 * @module LinkClassicTree
 */

import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { classicTreeState } from "../TreesCommon/state.js";
import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { handleLinkMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";

/**
 * @typedef {Object} LinkData
 * @property {Object} source - Source node with coordinates
 * @property {number} source.x - Source X coordinate
 * @property {number} source.y - Source Y coordinate
 * @property {Object} target - Target node with coordinates
 * @property {number} target.x - Target X coordinate
 * @property {number} target.y - Target Y coordinate
 */

/**
 * @typedef {Object} ClassicTreeNode
 * @property {Object} data - Node data object
 * @property {number} data.node_id - Unique node identifier
 * @property {boolean} data.is_leaf - Whether node is a leaf
 * @property {number} [data.left_child] - Left child node ID
 * @property {number} [data.right_child] - Right child node ID
 */

/**
 * Creates curved SVG path for tree links using quadratic Bezier curves.
 * Generates aesthetically pleasing curved connections between parent and child nodes.
 * 
 * @param {LinkData} linkData - Link data with source and target coordinates
 * @returns {string} SVG path string for curved link
 * @example
 * const pathString = createSplitPath({
 *   source: { x: 100, y: 50 },
 *   target: { x: 200, y: 150 }
 * });
 * // Returns: "M100,50 Q150,75 200,150" (quadratic curve)
 * 
 * @example
 * // Creates natural-looking tree branches
 * const curvePath = createSplitPath(linkData);
 * // Uses angular control for organic appearance
 * 
 * @see TREES_SETTINGS.tree.radianAngle
 */
function createSplitPath({ source, target }) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    const midY = (sourceY + targetY) / 2;
    const controlX = sourceX + (targetX - sourceX) / 2;
    const controlY =
        midY -
        Math.abs(targetX - sourceX) * Math.tan(TREES_SETTINGS.tree.radianAngle / 2);

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
}

/**
 * Determines link color based on decision tree logic.
 * Uses different colors for true/false decision branches with fallback for edge cases.
 * 
 * @param {ClassicTreeNode} sourceNode - Source node with decision logic
 * @param {number} targetNodeId - Target node ID
 * @returns {string} CSS color value for the link
 * @example
 * const color = determineLinkColor(splitNode, 10);
 * // Returns '#A50026' (red) for false branch or '#006837' (green) for true branch
 * 
 * @example
 * const leafColor = determineLinkColor(leafNode, childId);
 * // Returns default link color for leaf nodes
 * 
 * @see colorScheme.ui.falseLink
 * @see colorScheme.ui.trueLink
 * @see colorScheme.ui.linkStroke
 */
function determineLinkColor(sourceNode, targetNodeId) {
    if (!sourceNode || !sourceNode.data) {
        return colorScheme.ui.linkStroke;
    }
    
    const sourceData = sourceNode.data;
    
    if (sourceData.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    if (targetNodeId === sourceData.left_child) {
        return colorScheme.ui.trueLink;
    } else if (targetNodeId === sourceData.right_child) {
        return colorScheme.ui.falseLink;
    }
    
    return colorScheme.ui.linkStroke;
}

/**
 * Adds interactive curved links to the classic tree visualization.
 * Creates links with appropriate styling, tooltips, and decision branch coloring.
 * 
 * @param {d3.Selection} contentGroup - D3 container selection for link elements
 * @param {d3.HierarchyNode} treeData - D3 hierarchy data with link information
 * @param {Object} metrics - Layout metrics for stroke width calculation
 * @param {Object} [tooltip] - Optional tooltip object for hover interactions
 * @example
 * addLinks(contentGroup, hierarchyData, layoutMetrics, tooltipInstance);
 * // Adds all links with proper curved styling and interactions
 * 
 * @example
 * addLinks(svgGroup, treeData, metrics);
 * // Adds links without tooltip functionality
 * 
 * @see createSplitPath
 * @see determineLinkColor
 * @see getStrokeWidth
 */
export function addLinks(contentGroup, treeData, metrics, tooltip) {
    contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            const totalSamples = classicTreeState.treeData ? classicTreeState.treeData[0].n_samples : d.target.data.n_samples;
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples, 
                totalSamples, 
                metrics.linkStrokeWidth,
                TREES_SETTINGS.treeKindID.classic
            );
            const linkColor = determineLinkColor(d.source, d.target.data.node_id);
            
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
            d3.select(this).attr("data-original-stroke-color", linkColor);
        })
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .style("stroke", function(d) {
            return d3.select(this).attr("data-original-stroke-color");
        })
        .attr("d", (d) => createSplitPath(d))
        .style("fill", "none")
        .on("mouseover", (event, d) => {
            if (tooltip) {
                handleLinkMouseOver(
                    event, 
                    d.source.data.node_id, 
                    d.target.data.node_id, 
                    tooltip, 
                    TREES_SETTINGS.treeKindID.classic
                );
            }
        })
        .on("mousemove", (event) => {
            if (tooltip) {
                handleMouseMove(event, tooltip);
            }
        })
        .on("mouseout", () => {
            if (tooltip) {
                handleMouseOut(tooltip);
            }
        });
}

/**
 * Highlights instance path with persistent background highlighting.
 * Creates permanent visual indicators for the explained instance's path through the tree.
 * 
 * @param {d3.Selection} contentGroup - D3 container selection for path elements
 * @param {Array<number>} [pathNodeIds] - Array of node IDs forming the instance path
 * @example
 * highlightInstancePath(contentGroup, [0, 1, 3, 7]);
 * // Creates persistent background highlights for instance path
 * 
 * @example
 * // Auto-calculate path if not provided
 * highlightInstancePath(contentGroup);
 * // Uses tree processor to calculate instance path automatically
 * 
 * @see TreeDataProcessorFactory.create
 * @see colorScheme.ui.instancePathHighlight
 * @see TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier
 */
export function highlightInstancePath(contentGroup, pathNodeIds) {
    if (!pathNodeIds && classicTreeState.instanceData && classicTreeState.hierarchyRoot) {
        const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.classic);
        pathNodeIds = processor.findInstancePath(classicTreeState.instanceData);
    }

    if (!contentGroup || !pathNodeIds) {
        console.warn("Missing required parameters for highlightInstancePath");
        return;
    }

    contentGroup
        .selectAll(".link.instance-path")
        .classed("instance-path", false);
    contentGroup.selectAll(".link-highlight").remove();

    if (!pathNodeIds || pathNodeIds.length < 2) return;

    const linkPairs = pathNodeIds.slice(0, -1).map((source, i) => ({
        source,
        target: pathNodeIds[i + 1],
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
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", colorScheme.ui.instancePathHighlight)
                .style("stroke-width", `${baseStrokeWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                .style("fill", "none")
                .style("opacity", colorScheme.opacity.originalInstancePath)
                .lower();

            originalPath.classed("instance-path", true);
        });
}
