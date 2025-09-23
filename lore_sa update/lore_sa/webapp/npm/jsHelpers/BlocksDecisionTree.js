/**
 * @fileoverview Creates blocks-style decision tree visualization with rectangular node layout.
 * Provides interactive tree visualization with depth-aligned positioning and highlighting capabilities.
 * @author Generated documentation
 * @module BlocksDecisionTree
 */

import {
    setBlocksTreeVisualization,
} from "./visualizationConnector.js";
import { calculateTreeMetrics, depthAlignedLayout } from "./TreesCommon/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createTooltip,
    ensureVisualizationVisibility,
    initializeZoom
}from "./TreesCommon/svg.js";
import { createLinks, renderLinks } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { renderNodes, renderLabels } from "./BlocksDecisionTreeHelpers/node_blocksTree.js";
import { blocksTreeState } from "./TreesCommon/state.js";
import { TREES_SETTINGS } from "./TreesCommon/settings.js";
import { createHierarchy, getAllPathsFromHierarchy, traceInstancePath } from "./visualizationConnectorHelpers/TreeDataProcessor.js";

/**
 * @typedef {Object} BlocksTreeVisualization
 * @property {d3.Selection} svg - SVG container element
 * @property {d3.Selection} container - Main content group
 * @property {Object} nodePositions - Node position mappings
 * @property {Array} links - Tree link connections
 * @property {Array} instancePath - Path through tree for explained instance
 * @property {d3.Selection} linkElements - D3 selection of link elements
 * @property {d3.Selection} nodeElements - D3 selection of node elements
 * @property {Array} allPaths - All root-to-leaf paths in tree
 * @property {Array} rawTreeData - Original tree data structure
 */

/**
 * Creates a blocks-style decision tree visualization with rectangular nodes.
 * Uses depth-aligned layout for clear hierarchy visualization and supports instance path highlighting.
 * 
 * @param {Array<Object>} rawTreeData - Raw tree node data from backend
 * @param {Object} instance - Instance data for path highlighting
 * @returns {BlocksTreeVisualization} Complete visualization object with interaction capabilities
 * @throws {Error} When container element is not found or data is invalid
 * @example
 * const visualization = createBlocksTreeVisualization(treeData, {
 *   feature1: 1.0,
 *   feature2_category_A: 1
 * });
 * // Creates blocks tree with highlighted instance path
 * 
 * @see calculateTreeMetrics
 * @see depthAlignedLayout
 * @see renderNodes
 * @see renderLinks
 */
export function createBlocksTreeVisualization(rawTreeData, instance) {
    const containerSelector = "#blocks-tree-plot";

    blocksTreeState.treeData = rawTreeData;
    blocksTreeState.instanceData = instance;
    blocksTreeState.hierarchyRoot = createHierarchy(TREES_SETTINGS.treeKindID.blocks);

    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container ${containerSelector} not found in DOM`);
        return;
    }

    clearExistingSVG(containerSelector, TREES_SETTINGS.treeKindID.blocks);
    ensureVisualizationVisibility();

    const tooltip = createTooltip();

    const instancePath = traceInstancePath(blocksTreeState.instanceData, TREES_SETTINGS.treeKindID.blocks);
    const allPaths = getAllPathsFromHierarchy(TREES_SETTINGS.treeKindID.blocks);
    const metrics = calculateTreeMetrics(allPaths, TREES_SETTINGS.treeKindID.blocks);

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(allPaths, instancePath, metrics, TREES_SETTINGS.treeKindID.blocks);

    const { svg, g } = createSVGContainer(
        containerSelector, 
        TREES_SETTINGS.treeKindID.blocks,
        effectiveWidth, 
        effectiveHeight,
    );

    initializeZoom(svg, g, TREES_SETTINGS.treeKindID.blocks);

    const links = createLinks(allPaths, nodePositions);
    const linkElements = renderLinks(g, links, instancePath, tooltip);

    const nodeElements = renderNodes(g, nodePositions, instancePath, tooltip, metrics);
    renderLabels(g, nodePositions);

    const visualization = {
        svg,
        container: g,
        nodePositions,
        links,
        instancePath,
        linkElements,
        nodeElements,
        allPaths,
        rawTreeData: rawTreeData,
    };

    setBlocksTreeVisualization(visualization);
    
    return visualization;
}
