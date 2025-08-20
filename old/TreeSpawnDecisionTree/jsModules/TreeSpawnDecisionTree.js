import { createHierarchy } from "./TreeSpawnDecisionTreeHelpers/dataProcessing.js";
import { getVisualizationSettings } from "./TreeSpawnDecisionTreeHelpers/settings.js";
import {
    calculateInitialTransform,
    calculateMetrics,
} from "./TreeSpawnDecisionTreeHelpers/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
} from "./TreeSpawnDecisionTreeHelpers/svg.js";
import { addLinks } from "./TreeSpawnDecisionTreeHelpers/link.js";
import { addNodes } from "./TreeSpawnDecisionTreeHelpers/node.js";
import { initializeZoom } from "./TreeSpawnDecisionTreeHelpers/zoom.js";
import { createLinearPathLayout } from "./TreeSpawnDecisionTreeHelpers/subtrees.js";
import { traceInstancePath } from "./TreeSpawnDecisionTreeHelpers/instancePath.js";

// Global variables to store current visualization state
let currentVisualizationState = null;

// Function to create a color map from unique class labels
function createColorMap(rawTreeData, colorPalette) {
    // Extract all unique class labels from leaf nodes
    const uniqueClasses = new Set();
    rawTreeData.forEach(node => {
        if (node.is_leaf && node.class_label !== undefined && node.class_label !== null) {
            uniqueClasses.add(node.class_label);
        }
    });
    
    // Convert to array and sort for consistent ordering
    const classArray = Array.from(uniqueClasses).sort();
    
    // Create color mapping
    const colorMap = {};
    classArray.forEach((classLabel, index) => {
        colorMap[classLabel] = colorPalette[index % colorPalette.length];
    });
    
    return colorMap;
}

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
    
    // Remove existing nodes and links
    contentGroup.selectAll('.node').remove();
    contentGroup.selectAll('.link').remove();
    
    // Re-add links and nodes with updated visibility
    addLinks(contentGroup, treeData, metrics, SETTINGS, instancePath);
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);
}

export function createTreeVisualization(rawTreeData, instanceData = null) {
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
    const colorMap = createColorMap(rawTreeData, SETTINGS.visual.colorPalette);
    
    // Trace the instance path if instance data is provided
    let instancePath = [];
    if (instanceData) {
        instancePath = traceInstancePath(rawTreeData, instanceData);
    }

    const root = d3.hierarchy(hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS);

    // Clear existing visualization and tooltips
    clearExistingSVG();
    // Also remove any existing tooltips
    d3.selectAll('.decision-tree-tooltip').remove();
    
    const svg = createSVGContainer(SETTINGS);
    const contentGroup = createContentGroup(svg, SETTINGS);
    const tooltip = createTooltip();

    // Use the new linear path layout instead of standard tree layout
    const treeData = createLinearPathLayout(root, metrics, SETTINGS, instancePath);

    addBackgroundLayer(contentGroup, SETTINGS, metrics);
    addLinks(contentGroup, treeData, metrics, SETTINGS, instancePath);
    // Pass instanceData to addNodes function
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

    return { contentGroup, treeData, metrics, instancePath };
}