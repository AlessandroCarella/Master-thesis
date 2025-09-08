/**
 * @fileoverview Creates classic hierarchical decision tree visualization with traditional tree layout.
 * Provides interactive tree visualization with zoom, pan, and instance path highlighting capabilities.
 * @author Generated documentation
 * @module ClassicDecisionTree
 */

import { calculateMetrics, createTreeLayout, calculateInitialTransform } from "./TreesCommon/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
    initializeZoom
} from "./TreesCommon/svg.js";
import { addLinks } from "./ClassicDecisionTreeHelpers/link_classicTree.js";
import { addNodes } from "./ClassicDecisionTreeHelpers/node_classicTree.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { classicTreeState } from "./TreesCommon/state.js";
import { TREES_SETTINGS } from "./TreesCommon/settings.js";
import { registerClassicTree } from "./visualizationConnectorHelpers/HighlightingCoordinator.js";
import { TreeDataProcessorFactory } from "./visualizationConnectorHelpers/TreeDataProcessor.js";
import { highlightInstancePathInTree } from "./visualizationConnector.js";

/**
 * @typedef {Object} ClassicTreeVisualization
 * @property {d3.Selection} contentGroup - Main content group for tree elements
 * @property {d3.HierarchyNode} treeData - D3 hierarchy data structure
 * @property {Object} metrics - Tree layout metrics and dimensions
 */

/**
 * Creates a classic hierarchical decision tree visualization.
 * Uses D3's tree layout algorithm for traditional parent-child positioning with zoom and pan support.
 * 
 * @param {Array<Object>} rawTreeData - Raw tree node data from backend
 * @param {Object} instance - Instance data for path highlighting (encoded features)
 * @param {string} container - CSS selector for the container element
 * @returns {ClassicTreeVisualization} Tree visualization object
 * @throws {Error} When container element is not found or data is invalid
 * @example
 * createTreeVisualization(treeData, {
 *   feature1: 1.0,
 *   feature2_encoded: 0.5
 * }, '#classic-tree-plot');
 * // Creates interactive tree with highlighted instance path
 * 
 * @see calculateMetrics
 * @see createTreeLayout
 * @see addNodes
 * @see addLinks
 */
export function createTreeVisualization(rawTreeData, instance, container) {    
    classicTreeState.treeData = rawTreeData;
    classicTreeState.instanceData = instance;
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.classic);
    classicTreeState.hierarchyRoot = processor.createHierarchy(rawTreeData);

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(classicTreeState.hierarchyRoot);
    const metrics = calculateMetrics(root, TREES_SETTINGS.treeKindID.classic);

    clearExistingSVG(container);
    const svg = createSVGContainer(container);
    const contentGroup = createContentGroup(svg);
    const tooltip = createTooltip();

    const treeLayout = createTreeLayout(metrics, root, TREES_SETTINGS.treeKindID.classic);
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

    registerClassicTree({ contentGroup, treeData, metrics });
    window.treeVisualization = { contentGroup, treeData, metrics };

    if (instance) {
        highlightInstancePathInTree(instance, TREES_SETTINGS.treeKindID.classic);
    }
}
