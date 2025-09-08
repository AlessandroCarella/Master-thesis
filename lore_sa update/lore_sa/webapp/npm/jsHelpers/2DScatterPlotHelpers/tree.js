/**
 * @fileoverview Tree interaction utilities for scatter plot point selection and decision tree path highlighting
 * @module tree
 * @author Generated documentation
 */

import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { 
    highlightingCoordinator,
} from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

/**
 * Toggles point highlighting and coordinates tree path highlighting across all visualizations
 * @description Handles point selection in scatter plot, manages global highlight state, and triggers tree path highlighting
 * @param {HTMLElement} node - DOM element of the clicked point
 * @param {Array<number>} d - 2D coordinate data of the clicked point [x, y]
 * @param {Object} data - Complete scatter plot data object
 * @param {Array<Array<number>>} data.transformedData - 2D coordinates for all points
 * @param {Array<Object>} data.originalData - Original encoded feature data for all points
 * @param {Array<string|number>} data.targets - Target class labels for all points
 * @param {Object} colorMap - Mapping from target classes to color values
 * @returns {void}
 * @example
 * // Called from point click handler
 * togglePointColor(clickedElement, pointData, scatterData, colorMapping);
 */
export function togglePointColor(node, d, data, colorMap) {
    const index = data.transformedData.indexOf(d);
    const originalFeatures = data.originalData[index];

    if (window.lastClickedPoint === node) {
        window.lastClickedPoint = null;
        
        highlightingCoordinator.resetAllHighlights();
        
        d3.selectAll("path.point")
            .style("fill", (d, i) => colorMap[data.targets[i]]);
        
        return;
    }

    highlightingCoordinator.resetAllHighlights();
    
    d3.selectAll("path.point")
        .style("fill", (d, i) => colorMap[data.targets[i]]);

    window.lastClickedPoint = node;
    d3.select(node)
        .style("fill", colorScheme.ui.highlight);

    highlightPathsInAllTreesUnified(originalFeatures);
}

/**
 * Highlights decision paths in all available tree visualizations using encoded features
 * @description Coordinates path highlighting across classic, blocks, and spawn trees using encoded feature data
 * @param {Object} originalFeatures - Encoded feature data for the selected point
 * @returns {void}
 * @throws {Error} Logs warnings if path finding or highlighting fails for any tree
 * @example
 * highlightPathsInAllTreesUnified({ feature_0: 0.5, feature_1: 1, feature_2: 0 });
 * @private
 */
function highlightPathsInAllTreesUnified(originalFeatures) {
    const handlers = [
        { kind: TREES_SETTINGS.treeKindID.classic, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.classic) },
        { kind: TREES_SETTINGS.treeKindID.blocks, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.blocks) },
        { kind: TREES_SETTINGS.treeKindID.spawn, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.spawn) }
    ];
    
    handlers.forEach(({ kind, handler }) => {
        if (handler) {
            try {
                const path = handler.findPath(originalFeatures);                
                if (path && path.length > 0) {
                    handler.highlightPath(path);
                } else {
                    console.warn(`No path found for ${kind} tree with encoded features`);
                }
            } catch (error) {
                console.warn(`Error highlighting ${kind} tree path with encoded features:`, error);
            }
        }
    });
}
