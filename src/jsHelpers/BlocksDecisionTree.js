import {
    setBlocksTreeVisualization,
} from "./visualizationConnector.js";
import { buildHierarchy, traceInstancePath, getAllPathsFromHierarchy } from "./BlocksDecisionTreeHelpers/dataProcessing_blocksTree.js";
import { getVisualizationSettings } from "./TreesCommon/settings.js";
import {
    calculateTreeMetrics,
    depthAlignedLayout,
} from "./BlocksDecisionTreeHelpers/metrics_blocksTree.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createTooltip,
    ensureVisualizationVisibility,
}from "./TreesCommon/svg.js";
import { createLinks, renderLinks } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { renderNodes, renderLabels } from "./BlocksDecisionTreeHelpers/node_blocksTree.js";
import { initializeZoom } from "./TreesCommon/zoom.js";
import { blocksTreeState } from "./TreesCommon/state.js";

export function createBlocksTreeVisualization(rawTreeData, instance) {
    const SETTINGS = getVisualizationSettings("blocks");
    const containerSelector = "#blocks-tree-plot";

    // Store the data
    blocksTreeState.treeData = rawTreeData;
    blocksTreeState.instanceData = instance;
    blocksTreeState.hierarchyRoot = buildHierarchy(rawTreeData);

    // Get the existing container
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container ${containerSelector} not found in DOM`);
        return;
    }

    // Clear any existing content and ensure visibility
    clearExistingSVG(containerSelector, "blocks");
    ensureVisualizationVisibility();

    // Create tooltip
    const tooltip = createTooltip();

    // Get paths and calculate layout
    const instancePath = traceInstancePath(blocksTreeState.instanceData);
    const allPaths = getAllPathsFromHierarchy();
    const metrics = calculateTreeMetrics(allPaths, SETTINGS, instancePath);

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(allPaths, SETTINGS, instancePath, metrics);

    // Create SVG container
    const { svg, g } = createSVGContainer(
        SETTINGS,
        containerSelector, 
        "blocks",
        effectiveWidth, 
        effectiveHeight,
    );

    // Setup zoom
    initializeZoom(svg, g, SETTINGS, "blocks");

    // Create and render links
    const links = createLinks(allPaths, nodePositions);
    const linkElements = renderLinks(g, links, instancePath, SETTINGS);

    // Render nodes and labels
    const nodeElements = renderNodes(g, nodePositions, instancePath, tooltip, SETTINGS);
    renderLabels(g, nodePositions, SETTINGS);

    // Create visualization object for interaction
    const visualization = {
        svg,
        container: g,
        nodePositions,
        links,
        instancePath,
        linkElements,
        nodeElements,
        allPaths
    };

    // Set the blocks tree visualization for interaction
    setBlocksTreeVisualization(visualization);
    
    return visualization;
}