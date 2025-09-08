/**
 * @fileoverview Tooltip utilities for tree visualizations with feature decoding and split condition display
 * @module tooltipTrees
 * @author Generated documentation
 */

import { TREES_SETTINGS } from "./settings.js";
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";
import { getTreeState } from "./state.js";

/**
 * Creates formatted tooltip content for tree nodes with decoded feature information
 * @description Generates HTML content showing node details including decoded split conditions, class labels, and statistics
 * @param {Object} nodeData - Node data object (varies by tree type)
 * @param {string} treeKind - Type of tree visualization (classic, blocks, or spawn)
 * @param {Object} featureMappingInfo - Feature mapping information for decoding
 * @returns {string[]} Array of HTML content strings for tooltip display
 * @throws {Error} Falls back to encoded feature display if decoding fails
 * @example
 * const content = createNodeTooltipContent(nodeData, "classic", mappingInfo);
 * @private
 */
function createNodeTooltipContent(nodeData, treeKind, featureMappingInfo) {
    const content = [];

    const node = treeKind === TREES_SETTINGS.treeKindID.blocks ? nodeData : nodeData.data;
    
    if (!node) {
        content.push("<strong>Error:</strong> No node data available");
        return content;
    }

    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);

    if (node.is_leaf) {
        content.push(`<strong>Class:</strong> ${node.class_label}`);
    } else {
        const encodedFeatureName = node.feature_name;
        const threshold = node.threshold;
        
        try {
            const decodedCondition = decoder.decodeTreeSplitCondition(encodedFeatureName, threshold, true);
            content.push(`<strong>Split:</strong> ${decodedCondition}`);            
        } catch (error) {
            console.warn("Error decoding split condition:", error);
            content.push(`<strong>Split:</strong> ${encodedFeatureName} ≤ ${threshold.toFixed(1)}`);
            content.push("<strong>Logic:</strong> Left ≤ threshold, Right > threshold");
        }
        
        content.push(`<strong>Feature Index:</strong> ${node.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.impurity.toFixed(4)}`);
    }

    content.push(`<strong>Samples:</strong> ${node.n_samples}`);

    if (node.weighted_n_samples) {
        const weightDiff = Math.abs(node.weighted_n_samples - node.n_samples);
        if (weightDiff > 0.01) {
            content.push(`<strong>Weighted Samples:</strong> ${node.weighted_n_samples.toFixed(2)}`);
        }
    }

    if (!node.is_leaf) {
        if (node.value && node.value.length > 0 && node.value[0].length > 0) {
            const valueArray = node.value[0];
            if (valueArray.length > 1) {
                const total = valueArray.reduce((sum, val) => sum + val, 0);
                const distribution = valueArray
                    .map((val) => ((val / total) * 100).toFixed(1) + "%")
                    .join(", ");
                content.push(`<strong>Class Distribution:</strong> [${distribution}]`);
            }
        }
    }

    if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        if (nodeData.hasHiddenChildren) {
            content.push(`<strong>Subtree:</strong> Right-click to expand`);
        } else if (nodeData.isExpanded) {
            content.push(`<strong>Subtree:</strong> Right-click to collapse`);
        }
    }

    return content;
}

/**
 * Creates formatted tooltip content for tree links showing path direction and split conditions
 * @description Generates HTML content for link tooltips including path direction and split thresholds
 * @param {string|number} sourceId - ID of the source node
 * @param {string|number} targetId - ID of the target node
 * @param {string} treeKind - Type of tree visualization
 * @returns {string[]} Array of HTML content strings for link tooltip display
 * @example
 * const content = createLinkTooltipContent("node_1", "node_2", "classic");
 * @private
 */
function createLinkTooltipContent(sourceId, targetId, treeKind) {
    const state = getTreeState(treeKind);
    
    if (!state.treeData) {
        return ["<strong>Link:</strong> Unknown"];
    }
    
    const sourceNode = state.treeData.find(node => node.node_id === sourceId);
    
    if (!sourceNode || sourceNode.is_leaf) {
        return ["<strong>Link:</strong> Unknown"];
    }
    
    let linkType = "Unknown";
    if (targetId === sourceNode.left_child) {
        linkType = "False (≤ threshold)";
    } else if (targetId === sourceNode.right_child) {
        linkType = "True (> threshold)";
    }
    
    const content = [];
    content.push(`<strong>Link Type:</strong> ${linkType}`);
    
    if (sourceNode.feature_name && sourceNode.threshold !== undefined) {
        const threshold = sourceNode.threshold;
        const thresholdStr = Number.isFinite(threshold) ? threshold.toFixed(1) : threshold;
        content.push(`<strong>Split:</strong> ${sourceNode.feature_name} ≤ ${thresholdStr}`);
    }
    
    return content;
}

/**
 * Handles mouse over events for tree nodes, showing detailed tooltips
 * @description Displays tooltip with node information including decoded features and statistics
 * @param {Event} event - Mouse event object containing position coordinates
 * @param {Object} nodeData - Tree node data object
 * @param {d3.Selection} tooltip - D3 selection of tooltip element
 * @param {string} treeKind - Type of tree visualization (classic, blocks, spawn)
 * @param {Object} featureMappingInfo - Feature mapping information for decoding
 * @returns {void}
 * @example
 * nodeElement.on("mouseover", (event, d) => 
 *   handleMouseOver(event, d, tooltip, "classic", mappingInfo)
 * );
 */
export function handleMouseOver(event, nodeData, tooltip, treeKind, featureMappingInfo) {
    const content = createNodeTooltipContent(nodeData, treeKind, featureMappingInfo);

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

/**
 * Handles mouse over events for tree links, showing path direction information
 * @description Displays tooltip with link information including path direction and split conditions
 * @param {Event} event - Mouse event object containing position coordinates
 * @param {string|number} sourceId - ID of the source node
 * @param {string|number} targetId - ID of the target node
 * @param {d3.Selection} tooltip - D3 selection of tooltip element
 * @param {string} treeKind - Type of tree visualization
 * @returns {void}
 * @example
 * linkElement.on("mouseover", (event, d) => 
 *   handleLinkMouseOver(event, d.source.id, d.target.id, tooltip, "classic")
 * );
 */
export function handleLinkMouseOver(event, sourceId, targetId, tooltip, treeKind) {
    const content = createLinkTooltipContent(sourceId, targetId, treeKind);

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

/**
 * Updates tooltip position to follow mouse movement
 * @description Moves tooltip to track with mouse cursor during hover interactions
 * @param {Event} event - Mouse move event containing new position coordinates
 * @param {d3.Selection} tooltip - D3 selection of tooltip element to reposition
 * @returns {void}
 * @example
 * element.on("mousemove", (event) => handleMouseMove(event, tooltip));
 */
export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

/**
 * Hides the tooltip when mouse leaves the target element
 * @description Conceals tooltip by setting visibility to hidden
 * @param {d3.Selection} tooltip - D3 selection of tooltip element to hide
 * @returns {void}
 * @example
 * element.on("mouseout", () => handleMouseOut(tooltip));
 */
export function handleMouseOut(tooltip) {
    tooltip.style("visibility", "hidden");
}
