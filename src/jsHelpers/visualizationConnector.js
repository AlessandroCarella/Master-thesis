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

import { findInstancePath } from "./TreesCommon/dataProcessing.js";
import { highlightInstancePath } from "./ClassicDecisionTreeHelpers/link_classicTree.js";
import { highlightInstancePathInBlocks } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { 
    highlightBlocksTreeNode, 
    highlightBlocksTreePath,
    highlightBlocksTreeDescendants,
    resetBlocksTreeHighlights
} from "./BlocksDecisionTreeHelpers/node_blocksTree.js";
import { 
    highlightTreeSpawnPath,
    highlightTreeSpawnNode,
    highlightTreeSpawnDescendants
} from "./TreeSpawnDecisionTreeHelpers/node_spawnTree.js";
import { 
    resetTreeSpawnHighlights,
    getPathToNodeInTreeSpawn,
    addInstancePathHighlightToTreeSpawn
} from "./TreeSpawnDecisionTreeHelpers/link_spawnTree.js"

let scatterPlotVisualization = null;
let treeVisualization = null;
let blocksTreeVisualization = null;
let treeSpawnVisualization = null;

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

export function setTreeSpawnVisualization(vis) {
    treeSpawnVisualization = vis;
    window.treeSpawnVisualization = vis;
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

export function getTreeSpawnVisualization() {
    return treeSpawnVisualization;
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
    blocksTreeVis = null,
    treeSpawnVis = null
) {
    event.stopPropagation();

    // Deselect if clicking the already selected node
    if (selectedNode === d) {
        resetHighlights(treeVis, scatterPlotVis);
        if (blocksTreeVis) {
            resetBlocksTreeHighlights(blocksTreeVis);
        }
        if (treeSpawnVis) {
            resetTreeSpawnHighlights(treeSpawnVis);
        }
        selectedNode = null;
        return;
    }

    resetHighlights(treeVis, scatterPlotVis);
    if (blocksTreeVis) {
        resetBlocksTreeHighlights(blocksTreeVis);
    }
    if (treeSpawnVis) {
        resetTreeSpawnHighlights(treeSpawnVis);
    }
    selectedNode = d;

    if (d.data.is_leaf) {
        // Highlight the clicked node in classic tree
        highlightNode(contentGroup, d, metrics);
        // For leaf nodes: highlight the path to the root and corresponding scatter plot points
        highlightPathToRoot(contentGroup, d, metrics);
        
        if (blocksTreeVis) {
            highlightBlocksTreeNode(blocksTreeVis, d.data.node_id);
            // Get path to root for blocks tree
            const pathToRoot = getPathToNodeInBlocks(d.data.node_id);
            if (pathToRoot.length > 0) {
                highlightBlocksTreePath(blocksTreeVis, pathToRoot);
            }
        }
        
        // Highlight in TreeSpawn tree
        if (treeSpawnVis) {
            highlightTreeSpawnNode(treeSpawnVis, d.data.node_id);
            const treeSpawnPath = getPathToNodeInTreeSpawn(treeSpawnVis, d.data.node_id);
            if (treeSpawnPath.length > 0) {
                highlightTreeSpawnPath(treeSpawnVis, treeSpawnPath);
            }
        }
        
        highlightPointsForLeaf(d, scatterPlotVis);
    } else {
        highlightNode(contentGroup, d, metrics);
        highlightDescendants(contentGroup, d, metrics);
        
        if (blocksTreeVis) {
            highlightBlocksTreeDescendants(blocksTreeVis, d.data.node_id);
        }
        
        if (treeSpawnVis) {
            highlightTreeSpawnDescendants(treeSpawnVis, d.data.node_id);
        }
        
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
    const pathNodeIds = findInstancePath(hierarchyRoot, instance, "classic");
    
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

export function highlightInstancePathInTreeSpawn(instance) {
    if (!treeSpawnVisualization || !instance) return;

    // Check if TreeSpawn visualization is fully initialized
    if (!treeSpawnVisualization.container || !treeSpawnVisualization.instancePath) {
        console.warn("TreeSpawn visualization not fully initialized, skipping instance path highlighting");
        return;
    }

    const { instancePath } = treeSpawnVisualization;

    // Use the existing instance path from the TreeSpawn tree
    if (instancePath && instancePath.length > 0) {
        try {
            // Use the highlight function that adds background highlights
            addInstancePathHighlightToTreeSpawn(treeSpawnVisualization, instancePath);
        } catch (error) {
            console.warn("Error highlighting TreeSpawn instance path:", error);
        }
    }
}

let originalPointsNeighPointsBoolArray = null;

export function getOriginalPointsNeighPointsBoolArrayValAti(i) {
    return originalPointsNeighPointsBoolArray[i];
}

export function setOriginalPointsNeighPointsBoolArray(value) {
    originalPointsNeighPointsBoolArray = value;
}