import {
    setTreeSpawnVisualization,
    highlightInstancePathInTreeSpawn,
} from "./visualizationConnector.js";
import { createHierarchy, traceInstancePath } from "./TreeSpawnDecisionTreeHelpers/dataProcessing_spawnTree.js";
import { getVisualizationSettings } from "./TreeSpawnDecisionTreeHelpers/settings_spawnTree.js";
import {
    calculateMetrics,
    createTreeLayout,
    calculateInitialTransform,
} from "./TreeSpawnDecisionTreeHelpers/metrics_spawnTree.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
} from "./TreeSpawnDecisionTreeHelpers/svg_spawnTree.js";
import { addLinks } from "./TreeSpawnDecisionTreeHelpers/link_spawnTree.js";
import { addNodes } from "./TreeSpawnDecisionTreeHelpers/node_spawnTree.js";
import { initializeZoom } from "./TreeSpawnDecisionTreeHelpers/zoom_spawnTree.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { state } from "./TreeSpawnDecisionTreeHelpers/state_spawnTree.js";

export function createTreeSpawnVisualization(rawTreeData, instance, container) {
    const SETTINGS = getVisualizationSettings();
    
    // Store data in global state
    state.treeData = rawTreeData;
    state.instanceData = instance;
    state.hierarchyRoot = createHierarchy();
    
    // Trace instance path and store in state
    if (instance) {
        state.instancePath = traceInstancePath(rawTreeData, instance);
    }

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(state.hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS);

    const containerSelector = container || "#treespawn-tree-plot";
    clearExistingSVG(containerSelector);
    const svg = createSVGContainer(SETTINGS, containerSelector);
    const contentGroup = createContentGroup(svg, SETTINGS);
    const tooltip = createTooltip();

    const treeLayout = createTreeLayout(metrics, SETTINGS, root);
    const treeData = treeLayout(root);

    addBackgroundLayer(contentGroup, SETTINGS, metrics);
    addLinks(contentGroup, treeData, metrics, SETTINGS);
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap);

    const initialTransform = calculateInitialTransform(treeData, SETTINGS);
    const zoom = initializeZoom(
        svg,
        contentGroup,
        SETTINGS,
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
        instancePath: state.instancePath
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
    if (!state.treeData || !state.instanceData) {
        console.error("No visualization state stored for refresh");
        return;
    }
    
    // Recreate the visualization with current state
    createTreeSpawnVisualization(state.treeData, state.instanceData, "#treespawn-tree-plot");
}