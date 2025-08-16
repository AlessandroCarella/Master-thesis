// DecisionTree.js - Updated with Linear Path Layout
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

// Default color map for classes
const defaultColorMap = {
    0: '#ff6b6b',  // Red
    1: '#4ecdc4',  // Teal
    2: '#45b7d1',  // Blue
    3: '#96ceb4',  // Green
    4: '#feca57',  // Yellow
    5: '#ff9ff3',  // Pink
    6: '#a55eea',  // Purple
    7: '#26de81', // Light Green
    // String-based class labels for datasets like iris
    'setosa': '#ff6b6b',     // Red
    'versicolor': '#4ecdc4', // Teal  
    'virginica': '#45b7d1'   // Blue
};

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

    const colorMap = defaultColorMap;
    
    // Trace the instance path if instance data is provided
    let instancePath = [];
    if (instanceData) {
        instancePath = traceInstancePath(rawTreeData, instanceData);
    }

    const root = d3.hierarchy(hierarchyRoot);
    const metrics = calculateMetrics(root, SETTINGS);

    clearExistingSVG();
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