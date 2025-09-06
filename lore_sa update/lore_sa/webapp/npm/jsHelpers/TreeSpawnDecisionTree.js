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

export function createTreeSpawnVisualization(rawTreeData, instance, container) {
    // Store data in global spawnTreeState
    spawnTreeState.treeData = rawTreeData;
    spawnTreeState.instanceData = instance;
    spawnTreeState.hierarchyRoot = createHierarchy(TREES_SETTINGS.treeKindID.spawn);
    
    // Trace instance path and store in spawnTreeState
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
    
    // Pass the initial scale to initializeZoom to fix zoom constraints
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
