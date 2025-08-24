import {
    setBlocksTreeVisualization,
} from "./visualizationConnector.js";
import { buildHierarchy, traceInstancePath, getAllPathsFromHierarchy } from "./BlocksDecisionTreeHelpers/dataProcessing_blocksTree.js";
import { getVisualizationSettings } from "./BlocksDecisionTreeHelpers/settings_blocksTree.js";
import {
    calculateTreeMetrics,
    depthAlignedLayout,
} from "./BlocksDecisionTreeHelpers/metrics_blocksTree.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createTooltip,
    ensureVisualizationVisibility,
} from "./BlocksDecisionTreeHelpers/svg_blocksTree.js";
import { createLinks, renderLinks } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { renderNodes, renderLabels } from "./BlocksDecisionTreeHelpers/node_blocksTree.js";
import { setupZoom } from "./BlocksDecisionTreeHelpers/zoom_blocksTree.js";
import { state } from "./BlocksDecisionTreeHelpers/state_blocksTree.js";

export function createBlocksTreeVisualization(rawTreeData, instance) {
    const SETTINGS = getVisualizationSettings();
    const containerSelector = "#blocks-tree-plot";

    // Store the data
    state.treeData = rawTreeData;
    state.instanceData = instance;
    state.hierarchyRoot = buildHierarchy(rawTreeData);

    // Get the existing container
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container ${containerSelector} not found in DOM`);
        return;
    }

    // Clear any existing content and ensure visibility
    clearExistingSVG(containerSelector);
    ensureVisualizationVisibility();

    // Create tooltip
    const tooltip = createTooltip();

    // Get paths and calculate layout
    const instancePath = traceInstancePath(state.instanceData);
    const allPaths = getAllPathsFromHierarchy();
    const metrics = calculateTreeMetrics(allPaths, SETTINGS, instancePath);

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(allPaths, SETTINGS, instancePath, metrics);

    // Create SVG container
    const { svg, g } = createSVGContainer(
        containerSelector, 
        effectiveWidth, 
        effectiveHeight,
        SETTINGS
    );

    // Setup zoom
    setupZoom(svg, g, SETTINGS);

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