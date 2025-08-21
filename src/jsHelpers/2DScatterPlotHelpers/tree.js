import { colorScheme } from "../visualizationConnector.js";
import { 
    findBlocksTreePath, 
    highlightBlocksTreePathFromScatterPlot,
    resetBlocksTreeHighlights 
} from "../BlocksDecisionTreeHelpers/node_blocksTree.js";
import { getBlocksTreeVisualization } from "../visualizationConnector.js";

export function resetTreeHighlights(treeVisualization) {
    if (!treeVisualization || !treeVisualization.contentGroup) return;

    // Reset link styles - use original sample-based stroke widths
    treeVisualization.contentGroup
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        });

    // Reset node styles
    treeVisualization.contentGroup
        .selectAll(".node circle")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style(
            "stroke-width",
            `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
        );
}

export function highlightTreePath(path, treeVisualization) {
    // Reset any previous highlights
    resetTreeHighlights(treeVisualization);

    // Highlight the links in the path
    for (let i = 0; i < path.length - 1; i++) {
        const currentNode = path[i];
        const nextNode = path[i + 1];

        treeVisualization.contentGroup
            .selectAll(".link")
            .filter(
                (linkData) =>
                    linkData.source === currentNode &&
                    linkData.target === nextNode
            )
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                // Use the stored original stroke width as base and add highlight thickness
                return `${d3.select(this).attr("data-original-stroke-width")}px`;
            });
    }

    // Highlight all nodes in the path
    path.forEach((node) => {
        treeVisualization.contentGroup
            .selectAll(".node")
            .filter((d) => d === node)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style(
                "stroke-width",
                `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
            );
    });
}

export function findTreePath(features, root) {
    let path = [];
    let currentNode = root.treeData.descendants()[0]; // Start at root

    while (currentNode) {
        path.push(currentNode);

        // If we've reached a leaf node, stop
        if (currentNode.data.is_leaf) {
            break;
        }

        // Get the feature value for the current split
        const featureValue = features[currentNode.data.feature_name];

        // Decide which child to traverse to
        if (featureValue <= currentNode.data.threshold) {
            currentNode = currentNode.children?.[0] || null; // Left child
        } else {
            currentNode = currentNode.children?.[1] || null; // Right child
        }
    }

    return path;
}

// This function is used in pointsHelper.js to toggle a point's color and highlight tree paths.
export function togglePointColor(node, d, data, colorMap, treeVisualization) {
    // Reset all points to their original colors first
    d3.selectAll("path.point")
        .style("fill", (d, i) => colorMap[data.targets[i]])

    const index = data.transformedData.indexOf(d);
    const originalFeatures = data.originalData[index];

    // If clicking the same point, reset everything and exit
    if (window.lastClickedPoint === node) {
        window.lastClickedPoint = null;
        resetTreeHighlights(treeVisualization);
        
        // Also reset blocks tree highlights
        const blocksTreeVis = getBlocksTreeVisualization();
        if (blocksTreeVis) {
            resetBlocksTreeHighlights(blocksTreeVis);
        }
        return;
    }

    // Update the last clicked point and highlight only this point
    window.lastClickedPoint = node;
    d3.select(node)
        .style("fill", colorScheme.ui.highlight)

    // Find and highlight the corresponding path in the classical decision tree
    if (treeVisualization && treeVisualization.treeData) {
        const path = findTreePath(originalFeatures, treeVisualization);
        highlightTreePath(path, treeVisualization);
    }

    // Find and highlight the corresponding path in the blocks decision tree
    const blocksTreeVis = getBlocksTreeVisualization();
    if (blocksTreeVis) {
        try {
            const blocksPath = findBlocksTreePath(originalFeatures);
            if (blocksPath && blocksPath.length > 0) {
                highlightBlocksTreePathFromScatterPlot(blocksPath);
            }
        } catch (error) {
            console.warn("Could not highlight blocks tree path:", error);
        }
    }
}

// Function to reset all tree highlights (both classical and blocks)
export function resetAllTreeHighlights(treeVisualization) {
    // Reset classical tree highlights
    resetTreeHighlights(treeVisualization);
    
    // Reset blocks tree highlights
    const blocksTreeVis = getBlocksTreeVisualization();
    if (blocksTreeVis) {
        resetBlocksTreeHighlights(blocksTreeVis);
    }
}