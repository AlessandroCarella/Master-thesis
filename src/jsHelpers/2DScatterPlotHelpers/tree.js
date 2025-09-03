// 2DScatterPlotHelpers/tree.js - Updated to work with encoded features only
import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { 
    highlightingCoordinator,
} from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

// This function is used in pointsHelper.js to toggle a point's color and highlight tree paths.
export function togglePointColor(node, d, data, colorMap) {
    // Get the index of the clicked point
    const index = data.transformedData.indexOf(d);
    const originalFeatures = data.originalData[index];

    // If clicking the same point, reset everything and exit
    if (window.lastClickedPoint === node) {
        window.lastClickedPoint = null;
        
        // Use the new unified reset system
        highlightingCoordinator.resetAllHighlights();
        
        // Reset all scatter plot points to their original colors
        d3.selectAll("path.point")
            .style("fill", (d, i) => colorMap[data.targets[i]]);
        
        return;
    }

    // Reset all highlights (both tree and scatter plot) before applying new ones
    highlightingCoordinator.resetAllHighlights();
    
    // Reset all points to their original colors first
    d3.selectAll("path.point")
        .style("fill", (d, i) => colorMap[data.targets[i]]);

    // Update the last clicked point and highlight only this point
    window.lastClickedPoint = node;
    d3.select(node)
        .style("fill", colorScheme.ui.highlight);

    // Use unified highlighting approach for all trees with encoded features
    highlightPathsInAllTreesUnified(originalFeatures);
}

// Unified function to highlight paths in all available trees using encoded features only
function highlightPathsInAllTreesUnified(originalFeatures) {
    // Get all available handlers
    const handlers = [
        { kind: TREES_SETTINGS.treeKindID.classic, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.classic) },
        { kind: TREES_SETTINGS.treeKindID.blocks, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.blocks) },
        { kind: TREES_SETTINGS.treeKindID.spawn, handler: highlightingCoordinator.treeHandlers.get(TREES_SETTINGS.treeKindID.spawn) }
    ];
    
    // Highlight path in each available tree using encoded features directly
    handlers.forEach(({ kind, handler }) => {
        if (handler) {
            try {
                // originalFeatures now contains encoded feature names and values (0/1 for categorical, scaled values for numeric)
                const path = handler.findPath(originalFeatures);                
                if (path && path.length > 0) {
                    handler.highlightPath(path);
                } else {
                    console.warn(`No path found for ${kind} tree with encoded features`);
                }
            } catch (error) {
                console.warn(`Error highlighting ${kind} tree path with encoded features:`, error);
            }
        } else {
            console.warn(`No handler found for ${kind} tree`);
        }
    });
}
