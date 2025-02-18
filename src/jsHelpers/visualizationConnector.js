// visualization-connector.js

// Global state to store visualization references
let pcaVisualization = null;
let treeVisualization = null;

// Consistent color scheme for both visualizations
const colorScheme = {
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
    },
    // Opacity settings
    opacity: {
        active: 1.0,
        inactive: 1,
        hover: 0.8,
    },
};

// Generate and maintain consistent color mapping
function generateColorMap(classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
        console.error('Invalid classes array provided to generateColorMap');
        return {};
    }
    
    // Sort classes to ensure consistent ordering
    const sortedClasses = [...new Set(classes)].sort();
    const colorMap = {};
    
    sortedClasses.forEach((classLabel, index) => {
        colorMap[classLabel] = index < colorScheme.classColors.length
            ? colorScheme.classColors[index]
            : `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    });
    
    return colorMap;
}

// Get color for a node based on its class
function getNodeColor(node, colorMap) {
    if (!node) return colorScheme.ui.default;

    // For leaf nodes, use class color
    if (node.data && node.data.is_leaf) {
        return colorMap[node.data.class_label] || colorScheme.ui.default;
    }
    // For decision nodes, use default color
    return colorScheme.ui.default;
}

// Reset all highlights across visualizations
function resetHighlights() {
    // Reset decision tree highlights
    if (treeVisualization && treeVisualization.contentGroup) {
        treeVisualization.contentGroup
            .selectAll(".link")
            .style("stroke", colorScheme.ui.linkStroke)
            .style(
                "stroke-width",
                `${treeVisualization.metrics.linkStrokeWidth}px`
            );

        treeVisualization.contentGroup
            .selectAll(".node circle")
            .style("stroke", colorScheme.ui.nodeStroke)
            .style(
                "stroke-width",
                `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
            );
    }

    // Reset PCA plot highlights
    if (pcaVisualization && pcaVisualization.points) {
        const colorMap = generateColorMap([
            ...new Set(pcaVisualization.data.targets),
        ]);
        pcaVisualization.points
            .style("fill", (d, i) => colorMap[pcaVisualization.data.targets[i]])
            .style("opacity", colorScheme.opacity.hover);
    }
}

// Determine if a point belongs to a leaf node's decision path
function pointBelongsToLeaf(point, originalData, leafNode) {
    let currentNode = leafNode;
    while (currentNode.parent) {
        const parentData = currentNode.parent.data;
        if (!parentData.feature_name) continue;

        const featureValue = originalData[parentData.feature_name];
        const isLeftChild = currentNode === currentNode.parent.children[0];

        if (isLeftChild && featureValue > parentData.threshold) return false;
        if (!isLeftChild && featureValue <= parentData.threshold) return false;

        currentNode = currentNode.parent;
    }
    return true;
}

// Highlight points in PCA plot for selected leaf node
function highlightPointsForLeaf(leafNode) {
    if (!pcaVisualization || !pcaVisualization.points) return;

    const colorMap = generateColorMap([
        ...new Set(pcaVisualization.data.targets),
    ]);

    pcaVisualization.points
        .style("fill", (d, i) => {
            const originalData = pcaVisualization.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode)
                ? colorScheme.ui.highlight
                : colorMap[pcaVisualization.data.targets[i]];
        })
        .style("opacity", (d, i) => {
            const originalData = pcaVisualization.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode)
                ? colorScheme.opacity.active
                : colorScheme.opacity.inactive;
        });
}

// Enhanced tree node click handler
function handleTreeNodeClick(event, d, contentGroup, treeData, metrics) {
    event.stopPropagation();

    resetHighlights();

    if (d.data.is_leaf) {
        // Highlight path to root
        let currentNode = d;
        while (currentNode.parent) {
            contentGroup
                .selectAll(".link")
                .filter(
                    (linkData) =>
                        linkData.source === currentNode.parent &&
                        linkData.target === currentNode
                )
                .style("stroke", colorScheme.ui.highlight)
                .style("stroke-width", `${metrics.linkStrokeWidth}px`);

            currentNode = currentNode.parent;
        }

        // Highlight selected node
        d3.select(event.currentTarget)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`);

        // Highlight corresponding PCA points
        highlightPointsForLeaf(d);
    }
}

// Add a new function to store the global color map
let globalColorMap = null;

function setGlobalColorMap(classes) {
    if (Array.isArray(classes) && classes.length > 0) {
        globalColorMap = generateColorMap(classes);
    } else {
        globalColorMap = null;
    }
    return globalColorMap;
}

function getGlobalColorMap() {
    return globalColorMap;
}

// State management functions
function setPCAVisualization(vis) {
    pcaVisualization = vis;
    window.pcaVisualization = vis;
}

function setTreeVisualization(vis) {
    treeVisualization = vis;
    window.treeVisualization = vis;
}

function getPCAVisualization() {
    return pcaVisualization;
}

function getTreeVisualization() {
    return treeVisualization;
}

export {
    setPCAVisualization,
    setTreeVisualization,
    getPCAVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
    resetHighlights,
    generateColorMap,
    setGlobalColorMap,
    getGlobalColorMap,
    getNodeColor,
    colorScheme,
};
