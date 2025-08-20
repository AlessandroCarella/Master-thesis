export {
    colorScheme,
    getNodeColor,
} from "./visualizationConnectorHelpers/colors.js";

import {
    resetHighlights,
    highlightNode,
    highlightPathToRoot,
    highlightDescendants,
    highlightPointsForLeaf,
    highlightPointsForDescendants,
} from "./visualizationConnectorHelpers/highlight.js";

import { findInstancePath } from "./ClassicDecisionTreeHelpers/dataProcessing_classicTree.js";
import { highlightInstancePath } from "./ClassicDecisionTreeHelpers/link_classicTree.js";
import { highlightInstancePathInBlocks, resetBlocksLinkHighlights } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { 
    highlightBlocksTreeNode, 
    highlightBlocksTreePath,
    highlightBlocksTreeDescendants,
} from "./BlocksDecisionTreeHelpers/node_blocksTree.js";

let scatterPlotVisualization = null;
let treeVisualization = null;
let blocksTreeVisualization = null;

export function setScatterPlotVisualization(vis) {
    scatterPlotVisualization = vis;
    window.scatterPlotVisualization = vis;
}

export function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
}

export function setBlocksTreeVisualization(vis) {
    blocksTreeVisualization = vis;
    window.blocksTreeVisualization = vis;
}

export function getScatterPlotVisualization() {
    return scatterPlotVisualization;
}

export function getTreeVisualization() {
    return treeVisualization;
}

export function getBlocksTreeVisualization() {
    return blocksTreeVisualization;
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
    metrics,
    blocksTreeVis = null
) {
    event.stopPropagation();

    // Deselect if clicking the already selected node
    if (selectedNode === d) {
        resetHighlights(treeVis, scatterPlotVis);
        if (blocksTreeVis) {
            resetBlocksTreeHighlights(blocksTreeVis);
        }
        selectedNode = null;
        return;
    }

    resetHighlights(treeVis, scatterPlotVis);
    if (blocksTreeVis) {
        resetBlocksTreeHighlights(blocksTreeVis);
    }
    selectedNode = d;

    if (d.data.is_leaf) {
        // Highlight the clicked node in classic tree
        if (treeVis) {
            highlightNode(contentGroup, d, metrics);
            // For leaf nodes: highlight the path to the root and corresponding scatter plot points
            highlightPathToRoot(contentGroup, d, metrics);
        }
        
        // Highlight in blocks tree if available
        if (blocksTreeVis) {
            highlightBlocksTreeNode(blocksTreeVis, d.data.node_id);
            // Get path to root for blocks tree
            const pathToRoot = getPathToNodeInBlocks(d.data.node_id);
            if (pathToRoot.length > 0) {
                highlightBlocksTreePath(blocksTreeVis, pathToRoot);
            }
        }
        
        highlightPointsForLeaf(d, scatterPlotVis);
    } else {
        // For split nodes: highlight the node and all its descendants
        if (treeVis) {
            highlightNode(contentGroup, d, metrics);
            highlightDescendants(contentGroup, d, metrics);
        }
        
        // Highlight in blocks tree if available
        if (blocksTreeVis) {
            highlightBlocksTreeDescendants(blocksTreeVis, d.data.node_id);
        }
        
        // Add this line to highlight scatter plot points for all descendant nodes
        highlightPointsForDescendants(d, scatterPlotVis);
    }
}

// Helper function to get path to node in blocks tree
function getPathToNodeInBlocks(nodeId) {
    if (!blocksTreeVisualization) return [];
    
    // Use the blocks tree's allPaths to find the path to the node
    const allPaths = blocksTreeVisualization.allPaths || [];
    
    for (const path of allPaths) {
        const nodeIndex = path.indexOf(nodeId);
        if (nodeIndex !== -1) {
            // Return the path from root to this node
            return path.slice(0, nodeIndex + 1);
        }
    }
    
    return [];
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

export function highlightInstancePathInBlocksTree(instance) {
    if (!blocksTreeVisualization || !instance) return;

    const { container, instancePath } = blocksTreeVisualization;

    // Use the existing instance path from the blocks tree
    if (instancePath && instancePath.length > 0) {
        highlightInstancePathInBlocks(container, instancePath);
    }
}

// Reset highlights for blocks tree specifically
export function resetBlocksTreeHighlights(blocksTreeVis) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    // Reset link highlights
    resetBlocksLinkHighlights(blocksTreeVis.container);
    
    // Reset node highlights  
    blocksTreeVis.container
        .selectAll(".node")
        .style("stroke", "#666666")
        .style("stroke-width", "1px");
}

let originalPointsNeighPointsBoolArray = null;

export function getOriginalPointsNeighPointsBoolArrayValAti(i) {
    return originalPointsNeighPointsBoolArray[i];
}

export function setOriginalPointsNeighPointsBoolArray(value) {
    originalPointsNeighPointsBoolArray = value;
}
