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
    highlightPointsForNodeId,
    highlightPointsForNodeIdDescendants,
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
import { TREES_SETTINGS } from "./TreesCommon/settings.js";

// Visualization state tracking
let visualizationState = {
    scatterPlotCreated: false,
    classicTreeCreated: false,
    blocksTreeCreated: false,
    treeSpawnCreated: false,
};

// Visualization storage
let scatterPlotVisualization = null;
let treeVisualization = null;
let blocksTreeVisualization = null;
let treeSpawnVisualization = null;

// Setters with state tracking
export function setScatterPlotVisualization(vis) {
    scatterPlotVisualization = vis;
    window.scatterPlotVisualization = vis;
    visualizationState.scatterPlotCreated = vis !== null;
}

export function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
    visualizationState.classicTreeCreated = vis !== null;
}

export function setBlocksTreeVisualization(vis) {
    blocksTreeVisualization = vis;
    window.blocksTreeVisualization = vis;
    visualizationState.blocksTreeCreated = vis !== null;
}

export function setTreeSpawnVisualization(vis) {
    treeSpawnVisualization = vis;
    window.treeSpawnVisualization = vis;
    visualizationState.treeSpawnCreated = vis !== null;
}

// Getters
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

// State checking functions
export function isScatterPlotCreated() {
    return visualizationState.scatterPlotCreated && scatterPlotVisualization !== null;
}

export function isClassicTreeCreated() {
    return visualizationState.classicTreeCreated && treeVisualization !== null;
}

export function isBlocksTreeCreated() {
    return visualizationState.blocksTreeCreated && blocksTreeVisualization !== null;
}

export function isTreeSpawnCreated() {
    return visualizationState.treeSpawnCreated && treeSpawnVisualization !== null;
}

// Reset all visualization state (call when clearing visualizations)
export function resetVisualizationState() {
    visualizationState = {
        scatterPlotCreated: false,
        classicTreeCreated: false,
        blocksTreeCreated: false,
        treeSpawnCreated: false,
    };
    scatterPlotVisualization = null;
    treeVisualization = null;
    blocksTreeVisualization = null;
    treeSpawnVisualization = null;
    
    // Clear window references too
    window.scatterPlotVisualization = null;
    window.treeVisualization = null;
    window.blocksTreeVisualization = null;
    window.treeSpawnVisualization = null;
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

// Helper function to find classic tree node by ID
function findClassicTreeNodeById(nodeId) {
    if (!isClassicTreeCreated()) return null;
    
    const descendants = treeVisualization.treeData.descendants();
    return descendants.find(node => node.data.node_id === nodeId);
}

// Central highlighting coordination function that can be called by any tree type
export function coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, sourceTreeType, sourceNodeData = null, sourceContentGroup = null, sourceMetrics = null) {
    // Deselect if clicking the already selected node
    if (selectedNode === nodeId) {
        resetAllHighlights();
        selectedNode = null;
        return;
    }

    // Reset all highlights and select new node
    resetAllHighlights();
    selectedNode = nodeId;

    // Highlight in all available trees
    if (isLeaf) {
        highlightLeafNodeAcrossAllTrees(nodeId, sourceTreeType, sourceNodeData, sourceContentGroup, sourceMetrics);
    } else {
        highlightSplitNodeAcrossAllTrees(nodeId, sourceTreeType, sourceNodeData, sourceContentGroup, sourceMetrics);
    }
}

// Helper function to reset all highlights across all trees
function resetAllHighlights() {
    if (isClassicTreeCreated() && isScatterPlotCreated()) {
        resetHighlights(treeVisualization, scatterPlotVisualization);
    }
    if (isBlocksTreeCreated()) {
        resetBlocksTreeHighlights(blocksTreeVisualization);
    }
    if (isTreeSpawnCreated()) {
        resetTreeSpawnHighlights(treeSpawnVisualization);
    }
}

// Helper function to get raw tree data for scatter plot highlighting when classic tree isn't available
function getRawTreeData() {
    // Try to get raw tree data from any available tree state
    if (isBlocksTreeCreated()) {
        const blocksTreeData = window.blocksTreeState?.treeData || blocksTreeVisualization?.rawTreeData;
        if (blocksTreeData) {
            return blocksTreeData;
        }
    }
    
    if (isTreeSpawnCreated()) {
        const spawnTreeData = window.spawnTreeState?.treeData || treeSpawnVisualization?.rawTreeData;
        if (spawnTreeData) {
            return spawnTreeData;
        }
    }
    
    if (isClassicTreeCreated()) {
        const classicTreeData = window.classicTreeState?.treeData;
        if (classicTreeData) {
            return classicTreeData;
        }
    }
    
    console.warn("No raw tree data found for scatter plot highlighting");
    return null;
}

// Helper function to get path to node in blocks tree
function getPathToNodeInBlocks(nodeId) {
    if (!isBlocksTreeCreated()) return [];
    
    const allPaths = blocksTreeVisualization.allPaths || [];
    
    for (const path of allPaths) {
        const nodeIndex = path.indexOf(nodeId);
        if (nodeIndex !== -1) {
            return path.slice(0, nodeIndex + 1);
        }
    }
    
    return [];
}

// Highlight leaf node across all available trees
function highlightLeafNodeAcrossAllTrees(nodeId, sourceTreeType, sourceNodeData, sourceContentGroup, sourceMetrics) {
    // Highlight in classic tree if available (FIXED: always try if classic tree exists)
    if (isClassicTreeCreated()) {
        if (sourceTreeType === 'classic' && sourceNodeData && sourceContentGroup && sourceMetrics) {
            // Use provided classic tree data
            highlightNode(sourceContentGroup, sourceNodeData, sourceMetrics);
            highlightPathToRoot(sourceContentGroup, sourceNodeData, sourceMetrics);
        } else {
            // Find corresponding node in classic tree by nodeId
            const classicTreeNode = findClassicTreeNodeById(nodeId);
            if (classicTreeNode) {
                highlightNode(treeVisualization.contentGroup, classicTreeNode, treeVisualization.metrics);
                highlightPathToRoot(treeVisualization.contentGroup, classicTreeNode, treeVisualization.metrics);
            }
        }
    }
    
    // Highlight in blocks tree if available
    if (isBlocksTreeCreated()) {
        highlightBlocksTreeNode(blocksTreeVisualization, nodeId);
        const pathToRoot = getPathToNodeInBlocks(nodeId);
        if (pathToRoot.length > 0) {
            highlightBlocksTreePath(blocksTreeVisualization, pathToRoot);
        }
    }
    
    // Highlight in TreeSpawn tree if available
    if (isTreeSpawnCreated()) {
        highlightTreeSpawnNode(treeSpawnVisualization, nodeId);
        const treeSpawnPath = getPathToNodeInTreeSpawn(treeSpawnVisualization, nodeId);
        if (treeSpawnPath.length > 0) {
            highlightTreeSpawnPath(treeSpawnVisualization, treeSpawnPath);
        }
    }
    
    // Highlight scatter plot points if available
    if (isScatterPlotCreated()) {
        if (sourceTreeType === 'classic' && sourceNodeData) {
            // Use classic tree node data directly
            highlightPointsForLeaf(sourceNodeData, scatterPlotVisualization);
        } else {
            // Use node ID with raw tree data when classic tree isn't available
            const rawTreeData = getRawTreeData();
            if (rawTreeData) {
                highlightPointsForNodeId(nodeId, rawTreeData, scatterPlotVisualization);
            } else {
                console.warn("No raw tree data available for scatter plot highlighting");
            }
        }
    }
}

// Highlight split node across all available trees
function highlightSplitNodeAcrossAllTrees(nodeId, sourceTreeType, sourceNodeData, sourceContentGroup, sourceMetrics) {
    // Highlight in classic tree if available (FIXED: always try if classic tree exists)
    if (isClassicTreeCreated()) {
        if (sourceTreeType === 'classic' && sourceNodeData && sourceContentGroup && sourceMetrics) {
            // Use provided classic tree data
            highlightNode(sourceContentGroup, sourceNodeData, sourceMetrics);
            highlightPathToRoot(sourceContentGroup, sourceNodeData, sourceMetrics);
            highlightDescendants(sourceContentGroup, sourceNodeData, sourceMetrics);
        } else {
            // Find corresponding node in classic tree by nodeId
            const classicTreeNode = findClassicTreeNodeById(nodeId);
            if (classicTreeNode) {
                highlightNode(treeVisualization.contentGroup, classicTreeNode, treeVisualization.metrics);
                highlightPathToRoot(treeVisualization.contentGroup, classicTreeNode, treeVisualization.metrics);
                highlightDescendants(treeVisualization.contentGroup, classicTreeNode, treeVisualization.metrics);
            }
        }
    }
    
    // Highlight in blocks tree if available
    if (isBlocksTreeCreated()) {
        highlightBlocksTreeNode(blocksTreeVisualization, nodeId);
        const pathToRoot = getPathToNodeInBlocks(nodeId);
        if (pathToRoot.length > 0) {
            highlightBlocksTreePath(blocksTreeVisualization, pathToRoot);
        }
        highlightBlocksTreeDescendants(blocksTreeVisualization, nodeId);
    }
    
    // Highlight in TreeSpawn tree if available
    if (isTreeSpawnCreated()) {
        highlightTreeSpawnNode(treeSpawnVisualization, nodeId);
        const treeSpawnPath = getPathToNodeInTreeSpawn(treeSpawnVisualization, nodeId);
        if (treeSpawnPath.length > 0) {
            highlightTreeSpawnPath(treeSpawnVisualization, treeSpawnPath);
        }
        highlightTreeSpawnDescendants(treeSpawnVisualization, nodeId);
    }
    
    // Highlight scatter plot points if available
    if (isScatterPlotCreated()) {
        if (sourceTreeType === 'classic' && sourceNodeData) {
            // Use classic tree node data directly
            highlightPointsForDescendants(sourceNodeData, scatterPlotVisualization);
        } else {
            // Use node ID with raw tree data when classic tree isn't available
            const rawTreeData = getRawTreeData();
            if (rawTreeData) {
                highlightPointsForNodeIdDescendants(nodeId, rawTreeData, scatterPlotVisualization);
            } else {
                console.warn("No raw tree data available for scatter plot highlighting");
            }
        }
    }
}

// LEGACY: Keep the original function for classic tree backward compatibility
export function handleTreeNodeClick(
    event,
    d,
    contentGroup,
    metrics
) {
    event.stopPropagation();

    const nodeId = d.data.node_id;
    const isLeaf = d.data.is_leaf;

    // Use the new central coordination function
    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'classic', d, contentGroup, metrics);
}

export function highlightInstancePathInTree(instance) {
    if (!isClassicTreeCreated() || !instance) return;

    const { contentGroup, treeData } = treeVisualization;

    // Get the hierarchical data (before d3.hierarchy transformation)
    const hierarchyRoot = treeData.data;

    // Find the path for this instance
    const pathNodeIds = findInstancePath(hierarchyRoot, instance, TREES_SETTINGS.treeKindID.classic);
    
    // Highlight the path in the visualization
    highlightInstancePath(contentGroup, pathNodeIds);
}

export function highlightInstancePathInBlocksTree(instance) {
    if (!isBlocksTreeCreated() || !instance) return;

    const { container, instancePath } = blocksTreeVisualization;

    // Use the existing instance path from the blocks tree
    if (instancePath && instancePath.length > 0) {
        highlightInstancePathInBlocks(container, instancePath);
    }
}

export function highlightInstancePathInTreeSpawn(instance) {
    if (!isTreeSpawnCreated() || !instance) return;

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