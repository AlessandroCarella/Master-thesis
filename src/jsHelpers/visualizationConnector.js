export {
    colorScheme,
    setGlobalColorMap,
    getGlobalColorMap,
    getNodeColor,
} from "./visualizationConnectorHelpers/colors.js";

import {
    resetHighlights,
    highlightNode,
    highlightPath,
    highlightPathToRoot,
    highlightDescendants,
    highlightPointsForLeaf,
} from "./visualizationConnectorHelpers/highlight.js";

let scatterPlotVisualization = null;
let treeVisualization = null;

export function setScatterPlotVisualization(vis) {
    scatterPlotVisualization = vis;
    window.scatterPlotVisualization = vis;
}

export function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
}

export function getScatterPlotVisualization() {
    return scatterPlotVisualization;
}

export function getTreeVisualization() {
    return treeVisualization;
}

// Store the currently selected node
let selectedNode = null;

export function getSelectedNode() {
    return selectedNode;
}

export function setSelectedNode(node) {
    selectedNode = node;
}

// Main handler for a tree node click event
// Additional parameters are passed for the required elements (e.g. contentGroup, tree metrics, etc.)
export function handleTreeNodeClick(
    event,
    d,
    contentGroup,
    treeVis,
    scatterPlotVis,
    metrics
) {
    event.stopPropagation();

    // Deselect if clicking the already selected node
    if (selectedNode === d) {
        resetHighlights(treeVis, scatterPlotVis);
        selectedNode = null;
        return;
    }

    resetHighlights(treeVis, scatterPlotVis);
    selectedNode = d;
    
    if (d.data.is_leaf) {
        // Highlight the clicked node
        highlightNode(contentGroup, d, metrics);
        // For leaf nodes: highlight the path to the root and corresponding scatter plot points
        highlightPathToRoot(contentGroup, d, metrics);
        highlightPointsForLeaf(d, scatterPlotVis);
    }
}
