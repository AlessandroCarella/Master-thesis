import {
    setBlocksTreeVisualization,
} from "./visualizationConnector.js";
import { createHierarchy, traceInstancePath, getAllPathsFromHierarchy } from "./TreesCommon/dataProcessing.js";
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

export function createBlocksTreeVisualization(rawTreeData, instance) {
    const containerSelector = "#blocks-tree-plot";

    // Store the data
    blocksTreeState.treeData = rawTreeData;
    blocksTreeState.instanceData = instance;
    blocksTreeState.hierarchyRoot = createHierarchy("blocks");

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
    const instancePath = traceInstancePath(blocksTreeState.instanceData, "blocks");
    const allPaths = getAllPathsFromHierarchy("blocks");
    const metrics = calculateTreeMetrics(allPaths, "blocks");

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(allPaths, instancePath, metrics, "blocks");

    // Create SVG container
    const { svg, g } = createSVGContainer(
        containerSelector, 
        "blocks",
        effectiveWidth, 
        effectiveHeight,
    );

    // Setup zoom
    initializeZoom(svg, g, "blocks");

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
        allPaths
    };

    // Set the blocks tree visualization for interaction
    setBlocksTreeVisualization(visualization);
    
    return visualization;
}