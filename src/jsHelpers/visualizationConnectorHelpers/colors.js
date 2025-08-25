import { fetchClassColors } from "../API.js";

// Consistent color scheme for both visualizations
export const colorScheme = {
    // Predefined colors for class labels will be populated from API
    classColors: [],
    // UI element colors
    ui: {
        highlight: "#ff4444",
        default: "#cccccc",
        nodeStroke: "#666666",
        linkStroke: "#999999",
        background: "#ffffff",
        instancePathHighlight: "#d40f15",
        strokeMultiplierInstancePath: 2
    },
    // Opacity settings
    opacity: {
        default:1,
        neighPoint:1,
        datasetPoint:0.3,
        originalInstancePath:0.5,
        hidden:0,
        voronoi:0.2,
    },
    stroke: {
        voronoi:0.5,
        points2DScatterPlot:1,
    }
};

// Fetch colors from API
export async function initializeColors(method = 'umap') {
    try {
        const colors = await fetchClassColors(method);
        colorScheme.classColors = colors;
    } catch (error) {
        console.error("Failed to fetch class colors:", error);
        // Fallback to empty array if fetch fails
        colorScheme.classColors = [];
    }
}

// Generate and maintain consistent color mapping
export function generateColorMap(classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
        console.error("Invalid classes array provided to generateColorMap");
        return {};
    }

    // Sort classes to ensure consistent ordering
    const sortedClasses = [...new Set(classes)].sort((a, b) => b - a);
    const colorMap = {};

    sortedClasses.forEach((classLabel, index) => {
        colorMap[classLabel] = colorScheme.classColors[index];
    });

    return colorMap;
}

// Get color for a node based on its class
export function getNodeColor(node, colorMap) {
    if (!node) return colorScheme.ui.default;

    // For leaf nodes, use class color
    if (node.data && node.data.is_leaf) {
        return colorMap[node.data.class_label] || colorScheme.ui.default;
    }
    // For decision nodes, use default color
    return colorScheme.ui.default;
}

// Global color map state
let globalColorMap = null;
export function setGlobalColorMap(classes) {
    if (Array.isArray(classes) && classes.length > 0) {
        globalColorMap = generateColorMap(classes);
    } else {
        globalColorMap = null;
    }
    return globalColorMap;
}

export function getGlobalColorMap() {
    return globalColorMap;
}
