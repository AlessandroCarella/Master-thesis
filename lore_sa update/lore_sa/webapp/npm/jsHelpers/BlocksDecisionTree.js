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

export function createBlocksTreeVisualization(rawTreeData, instance) {
    const containerSelector = "#blocks-tree-plot";

    // Store the data
    blocksTreeState.treeData = rawTreeData;
    blocksTreeState.instanceData = instance;
    blocksTreeState.hierarchyRoot = createHierarchy(TREES_SETTINGS.treeKindID.blocks);

    // Get the existing container
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container ${containerSelector} not found in DOM`);
        return;
    }

    // Clear any existing content and ensure visibility
    clearExistingSVG(containerSelector, TREES_SETTINGS.treeKindID.blocks);
    ensureVisualizationVisibility();

    // Create tooltip
    const tooltip = createTooltip();

    // Get paths and calculate layout
    const instancePath = traceInstancePath(blocksTreeState.instanceData, TREES_SETTINGS.treeKindID.blocks);
    const allPaths = getAllPathsFromHierarchy(TREES_SETTINGS.treeKindID.blocks);
    const metrics = calculateTreeMetrics(allPaths, TREES_SETTINGS.treeKindID.blocks);

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(allPaths, instancePath, metrics, TREES_SETTINGS.treeKindID.blocks);

    // Create SVG container
    const { svg, g } = createSVGContainer(
        containerSelector, 
        TREES_SETTINGS.treeKindID.blocks,
        effectiveWidth, 
        effectiveHeight,
    );

    // Setup zoom
    initializeZoom(svg, g, TREES_SETTINGS.treeKindID.blocks);

    // Create and render links
    const links = createLinks(allPaths, nodePositions);
    const linkElements = renderLinks(g, links, instancePath);

    // Render nodes and labels
    const nodeElements = renderNodes(g, nodePositions, instancePath, tooltip);
    renderLabels(g, nodePositions);

    // Create visualization object for interaction
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

    // Set the blocks tree visualization for interaction
    setBlocksTreeVisualization(visualization);
    
    return visualization;
}