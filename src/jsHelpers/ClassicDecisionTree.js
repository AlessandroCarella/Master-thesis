import {
    setTreeVisualization,
    highlightInstancePathInTree,
} from "./visualizationConnector.js";
import { createHierarchy } from "./TreesCommon/dataProcessing.js";
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

export function createTreeVisualization(rawTreeData, instance, container) {    
    // Store data in global classicTreeState
    classicTreeState.treeData = rawTreeData;
    classicTreeState.instanceData = instance;
    classicTreeState.hierarchyRoot = createHierarchy(TREES_SETTINGS.treeKindID.classic);

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
    addLinks(contentGroup, treeData, metrics);
    addNodes(contentGroup, treeData, metrics, tooltip, colorMap);

    const initialTransform = calculateInitialTransform(treeData);
    
    // Pass the initial scale to initializeZoom to fix zoom constraints
    const zoom = initializeZoom(
        svg,
        contentGroup,
        initialTransform.k 
    );

    svg.call(zoom.transform, initialTransform);

    setTreeVisualization({ contentGroup, treeData, metrics });
    window.treeVisualization = { contentGroup, treeData, metrics };

    if (instance) {
        highlightInstancePathInTree(instance, TREES_SETTINGS.treeKindID.classic);
    }
}
