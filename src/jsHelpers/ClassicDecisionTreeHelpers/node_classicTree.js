import {
    colorScheme,
    getBlocksTreeVisualization,
    getNodeColor,
    getScatterPlotVisualization,
    getTreeSpawnVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
} from "../visualizationConnector.js";
import { calculateNodeRadius } from "./metrics_classicTree.js";
import { state } from "./state_classicTree.js";

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap
) {
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
        .append("circle")
        .attr("r", (d) => calculateNodeRadius(d, metrics))
        .style("fill", (d) => getNodeColor(d, colorMap))
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("stroke", colorScheme.ui.nodeStroke)
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics)
        );
        
    nodes.on("click", (event, d) => {
        // Get the other tree visualizations
        const blocksTreeVis = getBlocksTreeVisualization();
        const spawnTreeVis = getTreeSpawnVisualization();

        handleTreeNodeClick(
            event,
            d,
            contentGroup,
            getTreeVisualization(),
            getScatterPlotVisualization(),
            metrics,
            blocksTreeVis,
            spawnTreeVis
        );
    });

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics) {
    // Extract tooltip content creation to a separate function
    const content = createNodeTooltipContent(d);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

function createNodeTooltipContent(node) {
    const content = [];

    // Node type and primary information
    if (node.data.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${node.data.class_label}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                node.data.feature_name
            } ≤ ${node.data.threshold.toFixed(2)}`
        );
        content.push("<strong>Nodes disposition:</strong> Left True/Right False")
        content.push(`<strong>Feature Index:</strong> ${node.data.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.data.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${node.data.n_samples}`);

    // Add weighted samples if available
    if (node.data.weighted_n_samples) {
        const weightDiff = Math.abs(
            node.data.weighted_n_samples - node.data.n_samples
        );
        // Only show if there's a meaningful difference
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${node.data.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    if (!node.data.is_leaf) {
        // Add class distribution if available (summarized)
        if (node.data.value && node.data.value.length > 0 && node.data.value[0].length > 0) {
            const valueArray = node.data.value[0];
            if (valueArray.length > 1) {
                const total = valueArray.reduce((sum, val) => sum + val, 0);
                const distribution = valueArray
                    .map((val) => ((val / total) * 100).toFixed(1) + "%")
                    .join(", ");
                content.push(
                    `<strong>Class Distribution:</strong> [${distribution}]`
                );
            }
        }
    }

    return content;
}

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(event, d, tooltip, metrics) {
    tooltip.style("visibility", "hidden");
    d3.select(event.currentTarget)
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("opacity", colorScheme.opacity.hover);
}

// Helper function to highlight a specific node
export function highlightClassicTreeNode(contentGroup, nodeId) {
    if (!contentGroup) return;

    contentGroup
        .selectAll(".node")
        .filter((d) => d.data.node_id === nodeId)
        .select("circle")
        .style("stroke", colorScheme.ui.highlight)
}

// Helper function to reset node highlights
export function resetClassicTreeNodeHighlights(contentGroup) {
    if (!contentGroup) return;

    contentGroup
        .selectAll(".node circle")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", function() {
            // Get the metrics from the stored tree visualization
            const treeVis = getTreeVisualization();
            return `${treeVis.metrics.nodeBorderStrokeWidth}px`
        });
}

// Helper function to highlight a path in classic tree
export function highlightClassicTreePath(contentGroup, pathNodeIds) {
    if (!contentGroup || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightClassicTreeNode(contentGroup, nodeId);
    });
}

// Helper function to highlight descendants of a node
export function highlightClassicTreeDescendants(contentGroup, nodeId) {
    if (!contentGroup || !state.hierarchyRoot) return;

    // Find all descendant node IDs
    const descendants = [];
    
    function collectDescendants(node) {
        descendants.push(node.node_id);
        if (node.children) {
            node.children.forEach(child => collectDescendants(child));
        }
    }

    // Find the starting node in the hierarchy
    function findNode(node, targetId) {
        if (node.node_id === targetId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = findNode(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }

    const startNode = findNode(state.hierarchyRoot, nodeId);
    if (startNode) {
        collectDescendants(startNode);
        
        // Highlight all descendant nodes
        descendants.forEach(descendantId => {
            highlightClassicTreeNode(contentGroup, descendantId);
        });
    }
}