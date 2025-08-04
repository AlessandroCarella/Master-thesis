export {
    colorScheme,
    getNodeColor,
} from "./visualizationConnectorHelpers/colors.js";

import {
    resetHighlights,
    highlightNode,
    highlightPath,
    highlightPathToRoot,
    highlightDescendants,
    highlightPointsForLeaf,
    highlightPointsForDescendants,
} from "./visualizationConnectorHelpers/highlight.js";

import { findInstancePath } from "./DecisionTreeHelpers/dataProcessing.js";
import { highlightInstancePath } from "./DecisionTreeHelpers/link.js";

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

// Store the currently explained instance
let explainedInstance = null;

export function getExplainedInstance() {
    return explainedInstance;
}

export function setExplainedInstance(instance) {
    explainedInstance = instance;
}

let selectedNode = null;
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
    } else {
        // For split nodes: highlight the node and all its descendants
        highlightNode(contentGroup, d, metrics);
        highlightDescendants(contentGroup, d, metrics);
        // Add this line to highlight scatter plot points for all descendant nodes
        highlightPointsForDescendants(d, scatterPlotVis);
    }
}

export function highlightInstancePathInTree(instance) {
    if (!treeVisualization || !instance) return;

    const { contentGroup, treeData } = treeVisualization;

    // Get the hierarchical data (before d3.hierarchy transformation)
    const hierarchyRoot = treeData.data;

    // Find the path for this instance
    const pathNodeIds = findInstancePath(hierarchyRoot, instance);

    // Highlight the path in the visualization
    highlightInstancePath(contentGroup, pathNodeIds);
}

let originalPointsNeighPointsBoolArray = null;

export function getOriginalPointsNeighPointsBoolArrayValAti(i) {
    return originalPointsNeighPointsBoolArray[i];
}

export function setOriginalPointsNeighPointsBoolArray(value) {
    originalPointsNeighPointsBoolArray = value;
}
