import { colorScheme, generateColorMap } from "./colors.js";

// Determine if a point belongs to a leaf node's decision path
export function pointBelongsToLeaf(point, originalData, leafNode) {
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

// Reset all highlights across visualizations
// Note: pcaVis and treeVis are passed as parameters (state is managed elsewhere)
export function resetHighlights(treeVis, pcaVis) {
    // Reset decision tree highlights
    if (treeVis && treeVis.contentGroup) {
        treeVis.contentGroup
            .selectAll(".link")
            .style("stroke", colorScheme.ui.linkStroke)
            .style("stroke-width", `${treeVis.metrics.linkStrokeWidth}px`);

        treeVis.contentGroup
            .selectAll(".node circle")
            .style("stroke", colorScheme.ui.nodeStroke)
            .style(
                "stroke-width",
                `${treeVis.metrics.nodeBorderStrokeWidth}px`
            );
    }

    // Reset PCA plot highlights
    if (pcaVis && pcaVis.points) {
        const colorMap = generateColorMap([...new Set(pcaVis.data.targets)]);
        pcaVis.points
            .style("fill", (d, i) => colorMap[pcaVis.data.targets[i]])
            .style("opacity", colorScheme.opacity.hover);
    }
}

// Highlight points in PCA plot for selected leaf node
export function highlightPointsForLeaf(leafNode, pcaVis) {
    if (!pcaVis || !pcaVis.points) return;

    const colorMap = generateColorMap([...new Set(pcaVis.data.targets)]);
    pcaVis.points
        .style("fill", (d, i) => {
            const originalData = pcaVis.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode)
                ? colorScheme.ui.highlight
                : colorMap[pcaVis.data.targets[i]];
        })
        .style("opacity", (d, i) => {
            const originalData = pcaVis.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode)
                ? colorScheme.opacity.active
                : colorScheme.opacity.inactive;
        });
}

// Highlights a single node
export function highlightNode(contentGroup, node, metrics) {
    contentGroup
        .selectAll(".node")
        .filter((n) => n === node)
        .select("circle")
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("opacity", colorScheme.opacity.active);
}

// Highlights the link between two nodes
export function highlightPath(contentGroup, sourceNode, targetNode, metrics) {
    contentGroup
        .selectAll(".link")
        .filter(
            (linkData) =>
                linkData.source === sourceNode && linkData.target === targetNode
        )
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", `${metrics.linkStrokeWidth}px`);
}

// For leaf nodes: highlights all the paths from the leaf to the root
export function highlightPathToRoot(contentGroup, leafNode, metrics) {
    let currentNode = leafNode;
    while (currentNode.parent) {
        highlightNode(contentGroup, currentNode.parent, metrics);
        highlightPath(contentGroup, currentNode.parent, currentNode, metrics);
        currentNode = currentNode.parent;
    }
}

// Recursively highlights a node and all its descendants, including their connecting paths.
// Also highlights PCA points for leaf nodes.
export function highlightDescendants(contentGroup, node, metrics, pcaVis) {
    highlightNode(contentGroup, node, metrics);

    // If this is a leaf, highlight corresponding PCA points
    if (node.data.is_leaf) {
        highlightPointsForLeaf(node, pcaVis);
    }

    // Process children if available
    if (node.children) {
        node.children.forEach((child) => {
            highlightPath(contentGroup, node, child, metrics);
            highlightDescendants(contentGroup, child, metrics, pcaVis);
        });
    }
}
