import { createHierarchy } from "./TreeSpawnDecisionTreeHelpers/dataProcessing_spawnTree.js";
import { getVisualizationSettings } from "./TreeSpawnDecisionTreeHelpers/settings_spawnTree.js";
import {
    calculateInitialTransform,
    calculateMetrics,
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
import { createLinearPathLayout } from "./TreeSpawnDecisionTreeHelpers/subtrees_spawnTree.js";
import { traceInstancePath } from "./TreeSpawnDecisionTreeHelpers/instancePath_spawnTree.js";
import { setTreeSpawnVisualization } from "./visualizationConnector.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";

// Global variables to store current visualization state
let currentVisualizationState = null;

// Function to refresh the visualization after expand/collapse operations
export function refreshVisualization() {
    if (!currentVisualizationState) {
        console.error("No visualization state stored for refresh");
        return;
    }
    
    const { 
        contentGroup, 
        treeData, 
        metrics, 
        SETTINGS, 
        tooltip, 
        colorMap, 
        instancePath, 
        instanceData 
    } = currentVisualizationState;
    
    // Remove existing nodes and links (including background instance path links)
    contentGroup.selectAll('.node').remove();
    contentGroup.selectAll('.link').remove();
    contentGroup.selectAll('.instance-path-background').remove();
    
    // Re-add links (without automatic instance path background) and nodes with w visibility
    addLinks(contentGroup, treeData, metrics, SETTINGS);
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);
}

export function createTreeSpawnVisualization(rawTreeData, instanceData) {    
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

    // Create dynamic color map from the data using settings
    const colorMap = getGlobalColorMap();
    
    // Trace the instance path if instance data is provided
    let instancePath = [];
    instancePath = traceInstancePath(rawTreeData, instanceData);

    const root = d3.hierarchy(hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS);

    // Clear existing visualization and tooltips in the TreeSpawn container
    const containerSelector = "#treespawn-tree-plot";
    
    clearExistingSVG(containerSelector);
    
    const svg = createSVGContainer(SETTINGS, containerSelector);
    const contentGroup = createContentGroup(svg, SETTINGS);
    const tooltip = createTooltip();

    // Use the new linear path layout instead of standard tree layout
    const treeData = createLinearPathLayout(root, metrics, SETTINGS, instancePath);

    addBackgroundLayer(contentGroup, SETTINGS, metrics);
    
    // Add links without automatic instance path background highlighting
    addLinks(contentGroup, treeData, metrics, SETTINGS);
    
    // Add nodes (instance path nodes will still be rendered as rectangles)
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);

    const initialTransform = calculateInitialTransform(treeData, SETTINGS);
    const zoom = initializeZoom(
        svg,
        contentGroup,
        SETTINGS,
        metrics,
        initialTransform.k
    );

    svg.call(zoom.transform, initialTransform);

    // Store current visualization state for refresh operations
    currentVisualizationState = {
        contentGroup,
        treeData,
        metrics,
        SETTINGS,
        tooltip,
        colorMap,
        instancePath,
        instanceData
    };

    // Create visualization object and register it (now includes rawTreeData)
    const visualization = { 
        contentGroup, 
        treeData, 
        metrics, 
        instancePath,
        svg,
        container: contentGroup,
        rawTreeData: rawTreeData  // Store raw tree data for scatter plot integration
    };
    
    setTreeSpawnVisualization(visualization);

    return visualization;
}