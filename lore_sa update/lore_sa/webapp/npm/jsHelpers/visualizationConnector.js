/**
 * @fileoverview Simplified visualization connector using new coordination architecture.
 * Manages visualization state tracking and provides compatibility layer for legacy access.
 * @author Generated documentation
 * @module VisualizationConnector
 */

export {
    colorScheme,
    getNodeColor,
} from "./visualizationConnectorHelpers/colors.js";

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

/**
 * @typedef {Object} VisualizationState
 * @property {boolean} scatterPlotCreated - Whether scatter plot is created
 * @property {boolean} classicTreeCreated - Whether classic tree is created
 * @property {boolean} blocksTreeCreated - Whether blocks tree is created
 * @property {boolean} treeSpawnCreated - Whether tree spawn is created
 */

/**
 * Tracks visualization creation state for backward compatibility
 * @type {VisualizationState}
 */
let visualizationState = {
    scatterPlotCreated: false,
    classicTreeCreated: false,
    blocksTreeCreated: false,
    treeSpawnCreated: false,
};

/**
 * @type {Object|null} - Scatter plot visualization object
 */
let scatterPlotVisualization = null;

/**
 * @type {Object|null} - Tree visualization object
 */
let treeVisualization = null;

/**
 * @type {Object|null} - Blocks tree visualization object
 */
let blocksTreeVisualization = null;

/**
 * @type {Object|null} - Tree spawn visualization object
 */
let treeSpawnVisualization = null;

/**
 * @type {Object|null} - Currently explained instance data
 */
let explainedInstance = null;

/**
 * @type {Object|null} - Original instance data before encoding
 */
let originalInstance = null;

/**
 * Sets the explained instance with both encoded and original data.
 * Registers instance with highlighting coordinator for path highlighting.
 * 
 * @param {Object} encodedInstance - Encoded instance data for tree operations
 * @param {Object} originalInstance - Original instance data for reference
 * @param {Object} featureMappingInfo - Feature mapping information
 * @example
 * setExplainedInstance(
 *   { feature1_encoded: 1.0, feature2_cat_A: 1 },
 *   { feature1: 1.0, feature2: 'A' },
 *   mappingInfo
 * );
 * 
 * @see highlightingCoordinator.setExplainedInstance
 */
export function setExplainedInstance(encodedInstance, originalInstance, featureMappingInfo) {
    explainedInstance = encodedInstance;

    window.currentEncodedInstance = encodedInstance;
    window.currentOriginalInstance = originalInstance; 
    window.currentFeatureMappingInfo = featureMappingInfo;
    
    highlightingCoordinator.setExplainedInstance(encodedInstance);
}

/**
 * Sets scatter plot visualization and registers with highlighting system.
 * 
 * @param {Object|null} vis - Scatter plot visualization object
 * @example
 * setScatterPlotVisualization(myScatterPlot);
 * 
 * @see registerScatterPlot
 */
export function setScatterPlotVisualization(vis) {
    scatterPlotVisualization = vis;
    window.scatterPlotVisualization = vis;
    visualizationState.scatterPlotCreated = vis !== null;
    
    if (vis) {
        registerScatterPlot(vis);
    }
}

/**
 * Sets tree visualization and registers with highlighting system.
 * 
 * @param {Object|null} vis - Tree visualization object
 * @example
 * setTreeVisualization(myTreeVis);
 * 
 * @see registerClassicTree
 */
export function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
    visualizationState.classicTreeCreated = vis !== null;
    
    if (vis) {
        registerClassicTree(vis);
    }
}

/**
 * Sets blocks tree visualization and registers with highlighting system.
 * 
 * @param {Object|null} vis - Blocks tree visualization object
 * @example
 * setBlocksTreeVisualization(myBlocksTree);
 * 
 * @see registerBlocksTree
 */
export function setBlocksTreeVisualization(vis) {
    blocksTreeVisualization = vis;
    window.blocksTreeVisualization = vis;
    visualizationState.blocksTreeCreated = vis !== null;
    
    if (vis) {
        registerBlocksTree(vis);
    }
}

/**
 * Sets tree spawn visualization and registers with highlighting system.
 * 
 * @param {Object|null} vis - Tree spawn visualization object
 * @example
 * setTreeSpawnVisualization(myTreeSpawn);
 * 
 * @see registerSpawnTree
 */
export function setTreeSpawnVisualization(vis) {
    treeSpawnVisualization = vis;
    window.treeSpawnVisualization = vis;
    visualizationState.treeSpawnCreated = vis !== null;
    
    if (vis) {
        registerSpawnTree(vis);
    }
}

/**
 * Gets the currently explained instance data.
 * 
 * @returns {Object|null} Current explained instance
 * @example
 * const instance = getExplainedInstance();
 * if (instance) {
 *   console.log('Current instance:', instance);
 * }
 */
export function getExplainedInstance() {
    return explainedInstance;
}

/**
 * Gets the original instance data before encoding.
 * 
 * @returns {Object|null} Original instance data
 * @example
 * const original = getOriginalInstance();
 */
export function getOriginalInstance() {
    return originalInstance;
}

/**
 * Gets the scatter plot visualization object.
 * 
 * @returns {Object|null} Scatter plot visualization
 * @example
 * const scatterVis = getScatterPlotVisualization();
 */
export function getScatterPlotVisualization() {
    return scatterPlotVisualization;
}

/**
 * Gets the tree visualization object.
 * 
 * @returns {Object|null} Tree visualization
 * @example
 * const treeVis = getTreeVisualization();
 */
export function getTreeVisualization() {
    return treeVisualization;
}

/**
 * Gets the blocks tree visualization object.
 * 
 * @returns {Object|null} Blocks tree visualization
 * @example
 * const blocksVis = getBlocksTreeVisualization();
 */
export function getBlocksTreeVisualization() {
    return blocksTreeVisualization;
}

/**
 * Gets the tree spawn visualization object.
 * 
 * @returns {Object|null} Tree spawn visualization
 * @example
 * const spawnVis = getTreeSpawnVisualization();
 */
export function getTreeSpawnVisualization() {
    return treeSpawnVisualization;
}

/**
 * Checks if scatter plot visualization is created and available.
 * 
 * @returns {boolean} True if scatter plot is created
 * @example
 * if (isScatterPlotCreated()) {
 *   // Use scatter plot
 * }
 */
export function isScatterPlotCreated() {
    return visualizationState.scatterPlotCreated && scatterPlotVisualization !== null;
}

/**
 * Checks if classic tree visualization is created and available.
 * 
 * @returns {boolean} True if classic tree is created
 * @example
 * if (isClassicTreeCreated()) {
 *   // Use classic tree
 * }
 */
export function isClassicTreeCreated() {
    return visualizationState.classicTreeCreated && treeVisualization !== null;
}

/**
 * Checks if blocks tree visualization is created and available.
 * 
 * @returns {boolean} True if blocks tree is created
 * @example
 * if (isBlocksTreeCreated()) {
 *   // Use blocks tree
 * }
 */
export function isBlocksTreeCreated() {
    return visualizationState.blocksTreeCreated && blocksTreeVisualization !== null;
}

/**
 * Checks if tree spawn visualization is created and available.
 * 
 * @returns {boolean} True if tree spawn is created
 * @example
 * if (isTreeSpawnCreated()) {
 *   // Use tree spawn
 * }
 */
export function isTreeSpawnCreated() {
    return visualizationState.treeSpawnCreated && treeSpawnVisualization !== null;
}

/**
 * Resets all visualization state and clears stored references.
 * Also resets the highlighting coordinator.
 * 
 * @example
 * resetVisualizationState();
 * // All visualizations cleared and coordinator reset
 * 
 * @see highlightingCoordinator.resetAllHighlights
 */
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
    
    window.scatterPlotVisualization = null;
    window.treeVisualization = null;
    window.blocksTreeVisualization = null;
    window.treeSpawnVisualization = null;
    
    highlightingCoordinator.resetAllHighlights();
}

/**
 * Highlights instance path in classic tree visualization (legacy compatibility).
 * Uses encoded instance data for proper path tracing.
 * 
 * @param {Object} instance - Instance data to highlight path for
 * @example
 * highlightInstancePathInTree(encodedInstance);
 * 
 * @see TreeDataProcessorFactory.create
 */
export function highlightInstancePathInTree(instance) {
    if (!isClassicTreeCreated() || !instance) return;
    
    try {
        const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.classic);
        const pathNodeIds = processor.findInstancePath(instance);
        
        if (pathNodeIds.length > 0 && treeVisualization?.contentGroup) {
            import("./ClassicDecisionTreeHelpers/link_classicTree.js").then(module => {
                module.highlightInstancePath(treeVisualization.contentGroup, pathNodeIds);
            });
        }
    } catch (error) {
        console.warn("Error highlighting instance path in classic tree:", error);
    }
}

/**
 * Highlights instance path in tree spawn visualization (legacy compatibility).
 * Uses encoded instance data for proper path tracing.
 * 
 * @param {Object} instance - Instance data to highlight path for
 * @example
 * highlightInstancePathInTreeSpawn(encodedInstance);
 * 
 * @see TreeDataProcessorFactory.create
 */
export function highlightInstancePathInTreeSpawn(instance) {
    if (!isTreeSpawnCreated() || !instance) return;

    if (!treeSpawnVisualization.container || !treeSpawnVisualization.treeData) {
        console.warn("TreeSpawn visualization not fully initialized, skipping instance path highlighting");
        return;
    }

    try {
        const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.spawn);
        const instancePath = processor.findInstancePath(instance);
        
        if (instancePath && instancePath.length > 0) {
            import("./TreeSpawnDecisionTreeHelpers/link_spawnTree.js").then(module => {
                module.addInstancePathBackgroundDirect(treeSpawnVisualization, instancePath);
            });
        }
    } catch (error) {
        console.warn("Error highlighting TreeSpawn instance path:", error);
    }
}
