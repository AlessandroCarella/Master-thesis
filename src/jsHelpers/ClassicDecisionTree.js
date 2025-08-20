import {
    setTreeVisualization,
    highlightInstancePathInTree,
    getExplainedInstance,
} from "./visualizationConnector.js";
import { createHierarchy } from "./ClassicDecisionTreeHelpers/dataProcessing.js";
import { getVisualizationSettings } from "./ClassicDecisionTreeHelpers/settings.js";
import {
    calculateMetrics,
    createTreeLayout,
    calculateInitialTransform,
} from "./ClassicDecisionTreeHelpers/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
} from "./ClassicDecisionTreeHelpers/svg.js";
import { addLinks } from "./ClassicDecisionTreeHelpers/link.js";
import { addNodes } from "./ClassicDecisionTreeHelpers/node.js";
import { initializeZoom } from "./ClassicDecisionTreeHelpers/zoom.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";

export function createTreeVisualization(rawTreeData) {
    if (!rawTreeData) {
        console.error("No tree data provided to createTreeVisualization");
        return;
    }

    const SETTINGS = getVisualizationSettings();
    const hierarchyRoot = createHierarchy(rawTreeData);

    if (!hierarchyRoot) {
        console.error("Failed to create hierarchy from tree data");
        return;
    }

    const colorMap = getGlobalColorMap();

    const root = d3.hierarchy(hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS);

    clearExistingSVG();
    const svg = createSVGContainer(SETTINGS);
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

    let instance = getExplainedInstance();
    if (instance) {
        highlightInstancePathInTree(instance);
    }
}
