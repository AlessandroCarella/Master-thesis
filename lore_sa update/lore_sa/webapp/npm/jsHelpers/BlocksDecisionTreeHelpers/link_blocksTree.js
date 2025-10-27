/**
 * @fileoverview Link creation and rendering for blocks-style decision tree visualization.
 * Handles straight-line connections between rectangular nodes with decision branch coloring and interactive tooltips.
 * @author Generated documentation
 * @module LinkBlocksTree
 */

import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { blocksTreeState } from "../TreesCommon/state.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { handleLinkMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";

/**
 * @typedef {Object} LinkConnection
 * @property {Object} source - Source node position data
 * @property {number} source.x - Source X coordinate
 * @property {number} source.y - Source Y coordinate
 * @property {Object} target - Target node position data
 * @property {number} target.x - Target X coordinate
 * @property {number} target.y - Target Y coordinate
 * @property {number} sourceId - Source node ID
 * @property {number} targetId - Target node ID
 */

/**
 * @typedef {Object} NodePosition
 * @property {number} id - Node identifier
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {string} label - Node display label
 */

/**
 * Creates link connections from tree paths and node positions.
 * Generates unique links between consecutive nodes in all tree paths.
 * 
 * @param {Array<Array<number>>} allPaths - All root-to-leaf paths in the tree
 * @param {Object<number, NodePosition>} nodePositions - Mapping of node IDs to positions
 * @returns {Array<LinkConnection>} Array of link connection objects
 * @example
 * const links = createLinks(
 *   [[0, 1, 3], [0, 1, 4], [0, 2, 5]],
 *   { 0: {x: 100, y: 50}, 1: {x: 200, y: 100}, ... }
 * );
 * // Returns: [{source: pos0, target: pos1, sourceId: 0, targetId: 1}, ...]
 * 
 * @example
 * // Avoids duplicate links
 * const uniqueLinks = createLinks(paths, positions);
 * // Each unique parent-child relationship appears only once
 */
export function createLinks(allPaths, nodePositions) {
    const links = [];
    const added = new Set();

    allPaths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
            const sourceId = path[i];
            const targetId = path[i + 1];
            const id = `${sourceId}-${targetId}`;
            if (!added.has(id)) {
                added.add(id);
                links.push({
                    source: nodePositions[sourceId],
                    target: nodePositions[targetId],
                    sourceId,
                    targetId,
                });
            }
        }
    });

    return links;
}

/**
 * Determines link color based on decision tree logic.
 * Uses different colors for true/false decision branches with fallback for edge cases.
 * 
 * @param {number} sourceId - Source node ID
 * @param {number} targetId - Target node ID
 * @returns {string} CSS color value for the link
 * @example
 * const color = determineLinkColor(5, 10);
 * // Returns '#A50026' (red) for false branch or '#006837' (green) for true branch
 * 
 * @example
 * const leafColor = determineLinkColor(leafNodeId, childId);
 * // Returns default link color for leaf nodes
 * 
 * @see colorScheme.ui.falseLink
 * @see colorScheme.ui.trueLink
 * @see colorScheme.ui.linkStroke
 */
function determineLinkColor(sourceId, targetId) {
    if (!blocksTreeState.treeData) {
        return colorScheme.ui.linkStroke;
    }
    
    const sourceNode = blocksTreeState.treeData.find(node => node.node_id === sourceId);
    
    if (!sourceNode || sourceNode.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    if (targetId === sourceNode.left_child) {
        return colorScheme.ui.trueLink;
    } else if (targetId === sourceNode.right_child) {
        return colorScheme.ui.falseLink;
    }
    
    return colorScheme.ui.linkStroke; //fallback
}

/**
 * Checks if a link is part of the instance path.
 * Determines if link connects consecutive nodes in the instance traversal path.
 * 
 * @param {LinkConnection} link - Link object with source and target IDs
 * @param {Array<number>} instancePath - Array of node IDs in instance path
 * @returns {boolean} True if link is part of instance path
 * @example
 * const highlighted = isLinkHighlighted(
 *   { sourceId: 1, targetId: 3 },
 *   [0, 1, 3, 7]
 * );
 * // Returns: true (1->3 is consecutive in path)
 * 
 * @example
 * const notHighlighted = isLinkHighlighted(
 *   { sourceId: 1, targetId: 4 },
 *   [0, 1, 3, 7]
 * );
 * // Returns: false (1->4 not in path)
 */
function isLinkHighlighted(link, instancePath) {
    const sIdx = instancePath.indexOf(link.sourceId);
    const tIdx = instancePath.indexOf(link.targetId);
    return sIdx !== -1 && tIdx !== -1 && Math.abs(sIdx - tIdx) === 1;
}

/**
 * Renders interactive links in the blocks tree visualization.
 * Creates SVG line elements with appropriate styling, tooltips, and decision branch coloring.
 * 
 * @param {d3.Selection} container - D3 container selection for link elements
 * @param {Array<LinkConnection>} links - Array of link connections to render
 * @param {Array<number>} instancePath - Instance path for highlighting
 * @param {Object} tooltip - Tooltip object for hover interactions
 * @returns {d3.Selection} D3 selection of rendered link elements
 * @example
 * const linkElements = renderLinks(container, linkConnections, [0, 1, 3], tooltip);
 * // Creates all links with proper styling and interactions
 * 
 * @example
 * // Links with instance path highlighting
 * renderLinks(svgContainer, links, instancePath, tooltipInstance);
 * // Instance path links get highlighted class
 * 
 * @see createLinks
 * @see determineLinkColor
 * @see getStrokeWidth
 * @see isLinkHighlighted
 */
export function renderLinks(container, links, instancePath, tooltip) {
    return container
        .selectAll(".link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", (d) => `link ${isLinkHighlighted(d, instancePath) ? "highlighted" : ""}`)
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .each(function(d) {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const targetNode = processor.getNodeById(d.targetId);
            const linkColor = determineLinkColor(d.sourceId, d.targetId);
            
            if (!targetNode) {
                d3.select(this).attr("data-original-stroke-width", 1);
            } else {
                const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
                const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
                const strokeWidth = getStrokeWidth(samples, totalSamples, 3, TREES_SETTINGS.treeKindID.blocks);
                d3.select(this).attr("data-original-stroke-width", strokeWidth);
            }
            
            d3.select(this).attr("data-original-stroke-color", linkColor);
        })
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .style("stroke", function(d) {
            return d3.select(this).attr("data-original-stroke-color");
        })
        .on("mouseover", (event, d) => {
            if (tooltip) {
                handleLinkMouseOver(
                    event, 
                    d.sourceId, 
                    d.targetId, 
                    tooltip, 
                    TREES_SETTINGS.treeKindID.blocks
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
