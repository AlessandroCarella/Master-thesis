// Consistent color scheme for both visualizations
export const colorScheme = {
    // Predefined colors for class labels
    classColors: [
        "#8dd3c7",
        "#ffffb3",
        "#bebada",
        "#fb8072",
        "#80b1d3",
        "#fdb462",
        "#b3de69",
        "#fccde5",
        "#d9d9d9",
        "#bc80bd",
    ],
    // UI element colors
    ui: {
        highlight: "#ff4444",
        default: "#cccccc",
        nodeStroke: "#666666",
        linkStroke: "#999999",
        background: "#ffffff",
        instancePathHighlight: "#d40f15"
    },
    // Opacity settings
    opacity: {
        active: 1.0,
        inactive: 1,
        hover: 1,
    },
};

// Generate and maintain consistent color mapping
export function generateColorMap(classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
        console.error("Invalid classes array provided to generateColorMap");
        return {};
    }

    // Sort classes to ensure consistent ordering
    const sortedClasses = [...new Set(classes)].sort();
    const colorMap = {};

    sortedClasses.forEach((classLabel, index) => {
        colorMap[classLabel] =
            index < colorScheme.classColors.length
                ? colorScheme.classColors[index]
                : `#${Math.floor(Math.random() * 16777215).toString(16)}`;
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
