// DecisionTree.js - Updated with Linear Path Layout and Custom Color Palette
import { createHierarchy } from "./DecisionTreeHelpers/dataProcessing.js";
import { getVisualizationSettings } from "./DecisionTreeHelpers/settings.js";
import {
    calculateMetrics,
    createLinearPathLayout,
    calculateInitialTransform,
} from "./DecisionTreeHelpers/metrics.js";
import {
    clearExistingSVG,
    createSVGContainer,
    createContentGroup,
    createTooltip,
    addBackgroundLayer,
} from "./DecisionTreeHelpers/svg.js";
import { addLinks } from "./DecisionTreeHelpers/link.js";
import { addNodes } from "./DecisionTreeHelpers/node.js";
import { initializeZoom } from "./DecisionTreeHelpers/zoom.js";

// Custom color palette
const colorPalette = [
    "#8dd3c7",
    "#ffffb3",
    "#bebada",
    "#fb8072",
    "#80b1d3",
    "#fdb462",
    "#b3de69",
    "#fccde5",
    "#d9d9d9",
    "#bc80bd"
];

// Function to create a color map from unique class labels
function createColorMap(rawTreeData) {
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

// Function to trace the path through the decision tree for a given instance
function traceInstancePath(rawTreeData, instanceData) {
    const path = [];
    const nodesById = {};
    
    // Create lookup for nodes
    rawTreeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    let currentNode = nodesById[0]; // Start at root
    
    while (currentNode && !currentNode.is_leaf) {
        path.push(currentNode.node_id);
        
        const featureName = currentNode.feature_name;
        const threshold = currentNode.threshold;
        const instanceValue = instanceData[featureName];
        
        if (instanceValue === undefined) {
            console.warn(`Feature ${featureName} not found in instance data`);
            break;
        }
        
        // Decide which child to follow
        if (instanceValue <= threshold) {
            currentNode = nodesById[currentNode.left_child];
        } else {
            currentNode = nodesById[currentNode.right_child];
        }
    }
    
    // Add the final leaf node
    if (currentNode && currentNode.is_leaf) {
        path.push(currentNode.node_id);
    }
    
    return path;
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

    // Create dynamic color map from the data
    const colorMap = createColorMap(rawTreeData);
    
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
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath);

    const initialTransform = calculateInitialTransform(treeData, SETTINGS);
    const zoom = initializeZoom(
        svg,
        contentGroup,
        SETTINGS,
        metrics,
        initialTransform.k
    );

    svg.call(zoom.transform, initialTransform);

    return { contentGroup, treeData, metrics, instancePath };
}