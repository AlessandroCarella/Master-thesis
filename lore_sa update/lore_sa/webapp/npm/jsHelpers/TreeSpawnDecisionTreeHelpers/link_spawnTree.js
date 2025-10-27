/**
 * @fileoverview Link rendering utilities for TreeSpawn visualization with path highlighting and tooltips
 * @module link_spawnTree
 * @author Generated documentation
 */

import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { spawnTreeState } from "../TreesCommon/state.js";
import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { handleLinkMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";

/**
 * Creates SVG path for tree links with curved or straight styling based on path highlighting
 * @description Generates curved paths for non-highlighted links and straight paths for highlighted ones
 * @param {Object} linkData - Link data object containing source and target positioning
 * @param {Object} linkData.source - Source node position and state
 * @param {number} linkData.source.x - X coordinate of source node
 * @param {number} linkData.source.y - Y coordinate of source node
 * @param {boolean} linkData.source.isInPath - Whether source node is part of highlighted path
 * @param {Object} linkData.target - Target node position
 * @param {number} linkData.target.x - X coordinate of target node
 * @param {number} linkData.target.y - Y coordinate of target node
 * @returns {string} SVG path string for the link
 * @example
 * const pathString = createSplitPath({
 *   source: { x: 100, y: 50, isInPath: false },
 *   target: { x: 150, y: 100 }
 * });
 * @private
 */
function createSplitPath({ source, target }) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    
    const isSourceInPath = source.isInPath;
    
    if (isSourceInPath) {
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    } else {
        const midY = (sourceY + targetY) / 2;
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY =
            midY -
            Math.abs(targetX - sourceX) * Math.tan(TREES_SETTINGS.tree.radianAngle / 2);
        return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
    }
}

/**
 * Determines the appropriate color for a tree link based on decision path direction
 * @description Returns color-coded links: red for false paths (left child), green for true paths (right child)
 * @param {string|number} sourceNodeId - ID of the source node
 * @param {string|number} targetNodeId - ID of the target node
 * @returns {string} CSS color value for the link
 * @example
 * const linkColor = determineLinkColor("node_1", "node_2");
 * // Returns: "#A50026" for false path or "#006837" for true path
 * @private
 */
function determineLinkColor(sourceNodeId, targetNodeId) {
    if (!spawnTreeState.treeData) {
        return colorScheme.ui.linkStroke;
    }
    
    const sourceNode = spawnTreeState.treeData.find(node => node.node_id === sourceNodeId);
    
    if (!sourceNode || sourceNode.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    if (targetNodeId === sourceNode.left_child) {
        return colorScheme.ui.trueLink;
    } else if (targetNodeId === sourceNode.right_child) {
        return colorScheme.ui.falseLink;
    }
    
    return colorScheme.ui.linkStroke; //fallback
}

/**
 * Creates and renders tree links with interactive tooltips and proper styling
 * @description Generates SVG path elements for all visible tree links with stroke width based on sample counts
 * @param {d3.Selection} contentGroup - D3 selection of the content group to append links to
 * @param {Object} treeData - Complete tree data structure with link information
 * @param {Function} treeData.links - Function that returns array of link objects
 * @param {Object} metrics - Layout metrics for calculating stroke widths
 * @param {number} metrics.linkStrokeWidth - Base stroke width for link scaling
 * @param {d3.Selection} [tooltip] - Optional D3 selection of tooltip element for hover interactions
 * @returns {void}
 * @example
 * addLinks(contentGroup, hierarchyData, layoutMetrics, tooltipElement);
 */
export function addLinks(contentGroup, treeData, metrics, tooltip) {
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    contentGroup
        .selectAll(".link")
        .data(visibleLinks, d => `${d.source.data.node_id}-${d.target.data.node_id}`)
        .join("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            const totalSamples = spawnTreeState.treeData ? spawnTreeState.treeData[0].n_samples : d.target.data.n_samples;
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples || d.target.data.n_samples, 
                totalSamples, 
                metrics.linkStrokeWidth,
                TREES_SETTINGS.treeKindID.spawn
            );
            const linkColor = determineLinkColor(d.source.data.node_id, d.target.data.node_id);
            
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
        .style("opacity", colorScheme.opacity.default)
        .on("mouseover", (event, d) => {
            if (tooltip) {
                handleLinkMouseOver(
                    event, 
                    d.source.data.node_id, 
                    d.target.data.node_id, 
                    tooltip, 
                    TREES_SETTINGS.treeKindID.spawn
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
 * Adds highlighted background paths for instance traversal visualization
 * @description Creates emphasized path links showing the route taken by a specific instance through the tree
 * @param {Object} treeSpawnVis - TreeSpawn visualization object containing rendering context
 * @param {d3.Selection} treeSpawnVis.container - D3 selection of the content group
 * @param {Object} treeSpawnVis.treeData - Tree data structure with hierarchy information
 * @param {Object} treeSpawnVis.metrics - Layout metrics for stroke width calculations
 * @param {Array<string|number>} instancePath - Array of node IDs representing the instance's path through the tree
 * @returns {void}
 * @throws {Error} Logs warning if visualization object is not properly initialized
 * @example
 * addInstancePathBackgroundDirect(treeVisualization, ["node_0", "node_1", "node_3", "node_7"]);
 */
export function addInstancePathBackgroundDirect(treeSpawnVis, instancePath) {
    if (!treeSpawnVis || !treeSpawnVis.container || !treeSpawnVis.treeData || !treeSpawnVis.metrics) {
        console.warn("TreeSpawn visualization not properly initialized, cannot add instance path background");
        return;
    }
    
    const { container, treeData, metrics } = treeSpawnVis;
    
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
        .attr("class", "instance-path-background")
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
