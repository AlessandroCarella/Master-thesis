import { getOriginalPointsNeighPointsBoolArrayValAti } from "../visualizationConnector.js";
import { colorScheme, getGlobalColorMap } from "./colors.js";

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
// Note: scatterPlotVis and treeVis are passed as parameters (state is managed elsewhere)
export function resetHighlights(treeVis, scatterPlotVis) {
    // Reset decision tree highlights
    if (treeVis && treeVis.contentGroup) {
        treeVis.contentGroup
            .selectAll(".link")
            .style("stroke", colorScheme.ui.linkStroke)
            .style("stroke-width", function(d) {
                // Use the stored original stroke width instead of base metrics
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth}px`;
            });

        treeVis.contentGroup
            .selectAll(".node circle")
            .style("stroke", colorScheme.ui.nodeStroke)
            .style(
                "stroke-width",
                `${treeVis.metrics.nodeBorderStrokeWidth}px`
            );
    }

    // Reset Scatter plot highlights
    if (scatterPlotVis && scatterPlotVis.points) {
        scatterPlotVis.points
            .style("fill", (d, i) => getGlobalColorMap()[scatterPlotVis.data.targets[i]])
            .style("opacity", (d, i) =>
                getOriginalPointsNeighPointsBoolArrayValAti(i)
                    ? colorScheme.opacity.datasetPoint
                    : colorScheme.opacity.neighPoint
            );
    }
}

// Highlight points in scatter plot for selected leaf node
export function highlightPointsForLeaf(leafNode, scatterPlotVis) {
    if (!scatterPlotVis || !scatterPlotVis.points) return;

    scatterPlotVis.points
        .style("fill", (d, i) => {
            const originalData = scatterPlotVis.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode)
                ? colorScheme.ui.highlight
                : getGlobalColorMap()[scatterPlotVis.data.targets[i]];
        })
}

// Highlights a single node
export function highlightNode(contentGroup, node, metrics) {
    contentGroup
        .selectAll(".node")
        .filter((n) => n === node)
        .select("circle")
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("opacity", colorScheme.opacity.default);
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
        .style("stroke-width", function(d) {
            // Use the stored original stroke width as base and add highlight thickness
            const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
            return `${baseWidth}px`; 
        });
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
// Also highlights scatter plot points for leaf nodes.
export function highlightDescendants(
    contentGroup,
    node,
    metrics,
    scatterPlotVis
) {
    highlightNode(contentGroup, node, metrics);

    // If this is a leaf and scatterPlotVis is provided, highlight corresponding scatter plot points
    if (node.data.is_leaf && scatterPlotVis) {
        highlightPointsForLeaf(node, scatterPlotVis);
    }

    // Process children if available
    if (node.children) {
        node.children.forEach((child) => {
            highlightPath(contentGroup, node, child, metrics);
            highlightDescendants(contentGroup, child, metrics, scatterPlotVis);
        });
    }
}

// Collect all leaf nodes under a given node (including the node itself if it's a leaf)
export function collectLeafNodes(node) {
    if (!node) return [];

    if (node.data.is_leaf) {
        return [node];
    }

    let leaves = [];
    if (node.children) {
        node.children.forEach((child) => {
            leaves = leaves.concat(collectLeafNodes(child));
        });
    }

    return leaves;
}

// Highlight points in scatter plot for all leaf nodes under a split node
export function highlightPointsForDescendants(node, scatterPlotVis) {
    if (!scatterPlotVis || !scatterPlotVis.points) return;

    // Collect all leaf nodes under this node
    const leafNodes = collectLeafNodes(node);

    if (leafNodes.length === 0) return;

    scatterPlotVis.points
        .style("fill", (d, i) => {
            const originalData = scatterPlotVis.data.originalData[i];

            // Check if point belongs to any of the leaf nodes
            for (const leafNode of leafNodes) {
                if (pointBelongsToLeaf(d, originalData, leafNode)) {
                    return colorScheme.ui.highlight;
                }
            }

            return getGlobalColorMap()[scatterPlotVis.data.targets[i]];
        })
}
