import { colorScheme } from "../visualizationConnector.js";

export function resetTreeHighlights(treeVisualization) {
    if (!treeVisualization || !treeVisualization.contentGroup) return;

    // Reset link styles
    treeVisualization.contentGroup
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style(
            "stroke-width",
            `${treeVisualization.metrics.linkStrokeWidth}px`
        );

    // Reset node styles
    treeVisualization.contentGroup
        .selectAll(".node circle")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style(
            "stroke-width",
            `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
        );
}

export function highlightTreePath(path, treeVisualization) {
    // Reset any previous highlights
    resetTreeHighlights(treeVisualization);

    // Highlight the links in the path
    for (let i = 0; i < path.length - 1; i++) {
        const currentNode = path[i];
        const nextNode = path[i + 1];

        treeVisualization.contentGroup
            .selectAll(".link")
            .filter(
                (linkData) =>
                    linkData.source === currentNode &&
                    linkData.target === nextNode
            )
            .style("stroke", colorScheme.ui.highlight)
            .style(
                "stroke-width",
                `${treeVisualization.metrics.linkStrokeWidth}px`
            );
    }

    // Highlight all nodes in the path
    path.forEach((node) => {
        treeVisualization.contentGroup
            .selectAll(".node")
            .filter((d) => d === node)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style(
                "stroke-width",
                `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
            );
    });
}

export function findTreePath(features, root) {
    let path = [];
    let currentNode = root.treeData.descendants()[0]; // Start at root

    while (currentNode) {
        path.push(currentNode);

        // If we've reached a leaf node, stop
        if (currentNode.data.is_leaf) {
            break;
        }

        // Get the feature value for the current split
        const featureValue = features[currentNode.data.feature_name];

        // Decide which child to traverse to
        if (featureValue <= currentNode.data.threshold) {
            currentNode = currentNode.children?.[0] || null; // Left child
        } else {
            currentNode = currentNode.children?.[1] || null; // Right child
        }
    }

    return path;
}

// This function is used in pointsHelper.js to toggle a point’s color and highlight tree paths.
export function togglePointColor(node, d, data, colorMap, treeVisualization) {
    // Reset all points to their original colors first
    d3.selectAll("path.point")
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("opacity", colorScheme.opacity.hover);

    const index = data.pcaData.indexOf(d);
    const originalFeatures = data.originalData[index];

    // If clicking the same point, reset everything and exit
    if (window.lastClickedPoint === node) {
        window.lastClickedPoint = null;
        resetTreeHighlights(treeVisualization);
        return;
    }

    // Update the last clicked point and highlight only this point
    window.lastClickedPoint = node;
    d3.select(node)
        .style("fill", colorScheme.ui.highlight)
        .style("opacity", colorScheme.opacity.active);

    // Find and highlight the corresponding path in the decision tree
    if (treeVisualization && treeVisualization.treeData) {
        const path = findTreePath(originalFeatures, treeVisualization);
        highlightTreePath(path, treeVisualization);
    }
}
