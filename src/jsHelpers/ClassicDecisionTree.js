import {
    setTreeVisualization,
    highlightInstancePathInTree,
} from "./visualizationConnector.js";
import { createHierarchy } from "./TreesCommon/dataProcessing.js";
import { getVisualizationSettings } from "./TreesCommon/settings.js";
import { calculateMetrics, createTreeLayout, calculateInitialTransform } from "./TreesCommon/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
} from "./TreesCommon/svg.js";
import { addLinks } from "./ClassicDecisionTreeHelpers/link_classicTree.js";
import { addNodes } from "./ClassicDecisionTreeHelpers/node_classicTree.js";
import { initializeZoom } from "./TreesCommon/zoom.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { classicTreeState } from "./TreesCommon/state.js";

export function createTreeVisualization(rawTreeData, instance, container) {
    const SETTINGS = getVisualizationSettings("classic");
    
    // Store data in global classicTreeState
    classicTreeState.treeData = rawTreeData;
    classicTreeState.instanceData = instance;
    classicTreeState.hierarchyRoot = createHierarchy("classic");

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(classicTreeState.hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS, "classic");

    clearExistingSVG(container);
    const svg = createSVGContainer(SETTINGS, container);
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

    setTreeVisualization({ contentGroup, treeData, metrics });
    window.treeVisualization = { contentGroup, treeData, metrics };

    if (instance) {
        highlightInstancePathInTree(instance, "classic");
    }
}