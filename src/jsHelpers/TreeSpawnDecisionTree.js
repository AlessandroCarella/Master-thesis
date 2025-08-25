import {
    setTreeSpawnVisualization,
    highlightInstancePathInTreeSpawn,
} from "./visualizationConnector.js";
import { createHierarchy, findInstancePath } from "./TreesCommon/dataProcessing.js";
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

export function createTreeSpawnVisualization(rawTreeData, instance, container) {
    // Store data in global spawnTreeState
    spawnTreeState.treeData = rawTreeData;
    spawnTreeState.instanceData = instance;
    spawnTreeState.hierarchyRoot = createHierarchy("spawn");
    
    // Trace instance path and store in spawnTreeState
    if (instance) {
        spawnTreeState.instancePath = findInstancePath(null, instance, "spawn");
    }

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(spawnTreeState.hierarchyRoot);
    const metrics = calculateMetrics(root, "spawn");

    const containerSelector = container || "#treespawn-tree-plot";
    clearExistingSVG(containerSelector);
    const svg = createSVGContainer(containerSelector);
    const contentGroup = createContentGroup(svg);
    const tooltip = createTooltip();

    const treeLayout = createTreeLayout(metrics, root, "spawn");
    const treeData = treeLayout(root);

    addBackgroundLayer(contentGroup, metrics);
    addLinks(contentGroup, treeData, metrics);
    addNodes(contentGroup, treeData, metrics, tooltip, colorMap);

    const initialTransform = calculateInitialTransform(treeData);
    const zoom = initializeZoom(
        svg,
        contentGroup,
        metrics,
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

// Function to refresh the visualization after expand/collapse operations
export function refreshVisualization() {
    if (!spawnTreeState.treeData || !spawnTreeState.instanceData) {
        console.error("No visualization spawnTreeState stored for refresh");
        return;
    }
    
    // Recreate the visualization with current spawnTreeState
    createTreeSpawnVisualization(spawnTreeState.treeData, spawnTreeState.instanceData, "#treespawn-tree-plot");
}