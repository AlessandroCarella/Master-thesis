/**
 * @fileoverview Creates TreeSpawn-style decision tree visualization with innovative layout approach.
 * Provides interactive tree visualization with spawn-based positioning and instance path highlighting.
 * @author Generated documentation
 * @module TreeSpawnDecisionTree
 */

import {
    setTreeSpawnVisualization,
    highlightInstancePathInTreeSpawn,
} from "./visualizationConnector.js";
import { calculateMetrics, createTreeLayout, calculateInitialTransform } from "./TreesCommon/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
    initializeZoom
} from "./TreesCommon/svg.js";
import { addLinks } from "./TreeSpawnDecisionTreeHelpers/link_spawnTree.js";
import { addNodes } from "./TreeSpawnDecisionTreeHelpers/node_spawnTree.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { spawnTreeState } from "./TreesCommon/state.js";
import { TREES_SETTINGS } from "./TreesCommon/settings.js";
import { createHierarchy, findInstancePath } from "./visualizationConnectorHelpers/TreeDataProcessor.js";

/**
 * @typedef {Object} TreeSpawnVisualization
 * @property {d3.Selection} contentGroup - Main content group for tree elements
 * @property {d3.HierarchyNode} treeData - D3 hierarchy data structure
 * @property {Object} metrics - Tree layout metrics and dimensions
 * @property {d3.Selection} svg - SVG container element
 * @property {d3.Selection} container - Content container group
 * @property {Array} rawTreeData - Original tree data structure
 * @property {Array} instancePath - Path through tree for explained instance
 */

/**
 * Creates a TreeSpawn-style decision tree visualization with innovative layout.
 * Uses spawn-based positioning algorithm for optimized space utilization and visual clarity.
 * 
 * @param {Array<Object>} rawTreeData - Raw tree node data from backend
 * @param {Object} instance - Instance data for path highlighting (encoded features)
 * @param {string} [container="#treespawn-tree-plot"] - CSS selector for container element
 * @returns {TreeSpawnVisualization} Complete visualization object with interaction capabilities
 * @throws {Error} When container element is not found or data is invalid
 * @example
 * const spawnTree = createTreeSpawnVisualization(treeData, {
 *   feature1_encoded: 1.0,
 *   feature2_cat_A: 1
 * });
 * // Creates TreeSpawn visualization with highlighted instance path
 * 
 * @see calculateMetrics
 * @see createTreeLayout
 * @see addNodes
 * @see addLinks
 * @see highlightInstancePathInTreeSpawn
 */
export function createTreeSpawnVisualization(rawTreeData, instance, container) {
    spawnTreeState.treeData = rawTreeData;
    spawnTreeState.instanceData = instance;
    spawnTreeState.hierarchyRoot = createHierarchy(TREES_SETTINGS.treeKindID.spawn);
    
    if (instance) {
        spawnTreeState.instancePath = findInstancePath(null, instance, TREES_SETTINGS.treeKindID.spawn);
    }

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(spawnTreeState.hierarchyRoot);
    const metrics = calculateMetrics(root, TREES_SETTINGS.treeKindID.spawn);

    const containerSelector = container || "#treespawn-tree-plot";
    clearExistingSVG(containerSelector);
    const svg = createSVGContainer(containerSelector);
    const contentGroup = createContentGroup(svg);
    const tooltip = createTooltip();

    const treeLayout = createTreeLayout(metrics, root, TREES_SETTINGS.treeKindID.spawn);
    const treeData = treeLayout(root);

    addBackgroundLayer(contentGroup, metrics);
    addLinks(contentGroup, treeData, metrics, tooltip);
    addNodes(contentGroup, treeData, metrics, tooltip, colorMap);

    const initialTransform = calculateInitialTransform(treeData);
    
    const zoom = initializeZoom(
        svg,
        contentGroup,
        initialTransform.k
    );

    svg.call(zoom.transform, initialTransform);

    const visualization = { 
        contentGroup, 
        treeData, 
        metrics, 
        svg,
        container: contentGroup,
        rawTreeData: rawTreeData,
        instancePath: spawnTreeState.instancePath
    };

    setTreeSpawnVisualization(visualization);
    window.treeSpawnVisualization = visualization;

    if (instance) {
        highlightInstancePathInTreeSpawn(instance);
    }

    return visualization;
}
