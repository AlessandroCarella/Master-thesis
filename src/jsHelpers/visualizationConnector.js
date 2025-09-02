// visualizationConnector.js - Simplified version using new architecture
export {
    colorScheme,
    getNodeColor,
} from "./visualizationConnectorHelpers/colors.js";

// Import the new coordination system
import {
    highlightingCoordinator,
    registerClassicTree,
    registerBlocksTree,
    registerSpawnTree,
    registerScatterPlot,
    highlightInstancePathsForAllTrees,
} from "./visualizationConnectorHelpers/HighlightingCoordinator.js";

import { TreeDataProcessorFactory } from "./visualizationConnectorHelpers/TreeDataProcessor.js";
import { TREES_SETTINGS } from "./TreesCommon/settings.js";

// ============================================
// VISUALIZATION STATE TRACKING (Keep for backward compatibility)
// ============================================

let visualizationState = {
    scatterPlotCreated: false,
    classicTreeCreated: false,
    blocksTreeCreated: false,
    treeSpawnCreated: false,
};

// Visualization storage (keep for legacy access)
let scatterPlotVisualization = null;
let treeVisualization = null;
let blocksTreeVisualization = null;
let treeSpawnVisualization = null;

// ============================================
// SETTERS WITH NEW REGISTRATION (Updated to use new system)
// ============================================

export function setScatterPlotVisualization(vis) {
    scatterPlotVisualization = vis;
    window.scatterPlotVisualization = vis;
    visualizationState.scatterPlotCreated = vis !== null;
    
    // Register with new highlighting system
    if (vis) {
        registerScatterPlot(vis);
    }
}

export function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
    visualizationState.classicTreeCreated = vis !== null;
    
    // Register with new highlighting system
    if (vis) {
        registerClassicTree(vis);
    }
}

export function setBlocksTreeVisualization(vis) {
    blocksTreeVisualization = vis;
    window.blocksTreeVisualization = vis;
    visualizationState.blocksTreeCreated = vis !== null;
    
    // Register with new highlighting system
    if (vis) {
        registerBlocksTree(vis);
    }
}

export function setTreeSpawnVisualization(vis) {
    treeSpawnVisualization = vis;
    window.treeSpawnVisualization = vis;
    visualizationState.treeSpawnCreated = vis !== null;
    
    // Register with new highlighting system
    if (vis) {
        registerSpawnTree(vis);
    }
}

// ============================================
// GETTERS (Keep unchanged)
// ============================================

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

// ============================================
// STATE CHECKING FUNCTIONS (Keep unchanged)
// ============================================

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

// ============================================
// RESET STATE (Updated)
// ============================================

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
    
    // Reset highlighting coordinator
    highlightingCoordinator.resetAllHighlights();
}

// ============================================
// EXPLAINED INSTANCE MANAGEMENT (Keep unchanged)
// ============================================

let explainedInstance = null;

export function getExplainedInstance() {
    return explainedInstance;
}

export function setExplainedInstance(instance) {
    explainedInstance = instance;
}

// ============================================
// LEGACY COMPATIBILITY FUNCTIONS (Delegate to new system)
// ============================================

// Instance path highlighting functions (delegate to new system)
export function highlightInstancePathInTree(instance) {
    if (!isClassicTreeCreated() || !instance) return;
    
    try {
        const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.classic);
        const pathNodeIds = processor.findInstancePath(instance);
        
        if (pathNodeIds.length > 0 && treeVisualization?.contentGroup) {
            // Use the link helper to highlight the path
            import("./ClassicDecisionTreeHelpers/link_classicTree.js").then(module => {
                module.highlightInstancePath(treeVisualization.contentGroup, pathNodeIds);
            });
        }
    } catch (error) {
        console.warn("Error highlighting instance path in classic tree:", error);
    }
}

export function highlightInstancePathInTreeSpawn(instance) {
    if (!isTreeSpawnCreated() || !instance) return;

    if (!treeSpawnVisualization.container || !treeSpawnVisualization.instancePath) {
        console.warn("TreeSpawn visualization not fully initialized, skipping instance path highlighting");
        return;
    }

    const { instancePath } = treeSpawnVisualization;

    if (instancePath && instancePath.length > 0) {
        try {
            // Use the link helper to highlight the path
            import("./TreeSpawnDecisionTreeHelpers/link_spawnTree.js").then(module => {
                module.addInstancePathBackgroundDirect(treeSpawnVisualization, instancePath);
            });
        } catch (error) {
            console.warn("Error highlighting TreeSpawn instance path:", error);
        }
    }
}
