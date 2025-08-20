import { state } from "./state.js";
import { SPLIT_NODE_COLOR, ANIMATION_CONFIG } from "./settings.js";
import { getTreeStats, getUniqueClasses } from "./metrics.js";
import { 
    handleTreeNodeClick,
    colorScheme,
    getBlocksTreeVisualization
} from "../visualizationConnector.js";

export function getNodeById(nodeId) {
    const root = state.hierarchyRoot;
    if (!root) return null;

    function dfs(node) {
        if (node.data.node_id === nodeId) return node.data;
        if (node.children) {
            for (const c of node.children) {
                const f = dfs(c);
                if (f) return f;
            }
        }
        return null;
    }
    return dfs(root);
}

export function getAllLeaves() {
    return state.hierarchyRoot
        ? state.hierarchyRoot.leaves().map((d) => d.data)
        : [];
}

export function getAllNodes() {
    return state.hierarchyRoot
        ? state.hierarchyRoot.descendants().map((d) => d.data)
        : [];
}

export function getPathToNode(targetNodeId) {
    const root = state.hierarchyRoot;
    if (!root) return [];

    function findPath(node, path = []) {
        const current = [...path, node.data.node_id];
        if (node.data.node_id === targetNodeId) return current;
        if (node.children) {
            for (const child of node.children) {
                const found = findPath(child, current);
                if (found.length) return found;
            }
        }
        return [];
    }

    return findPath(root);
}

// Removed local getNodeColor function - now using global color management

export function getNodeLabelLines(nodeId, instance) {
    const node = getNodeById(nodeId);
    if (!node) return [`Node ${nodeId}`];

    if (node.is_leaf) {
        return [node.class_label || "Unknown"];
    }
    const th = Number(node.threshold) ?? 0;
    return [
        `${node.feature_name} > ${Number.isFinite(th) ? th.toFixed(3) : th}`,
        `Instance: ${instance?.[node.feature_name]}`,
    ];
}

export function getNodeLabel(nodeId, instance) {
    const lines = getNodeLabelLines(nodeId, instance);
    return lines.join("\n");
}

// Enhanced tooltip content creation function (adapted from classic tree)
function createNodeTooltipContent(node) {
    const content = [];

    // Node type and primary information
    if (node.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${node.class_label || "Unknown"}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                node.feature_name
            } > ${node.threshold.toFixed(2)}`
        );
        content.push(`<strong>Feature Index:</strong> ${node.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${node.n_samples || 0}`);

    // Add weighted samples if available
    if (node.weighted_n_samples) {
        const weightDiff = Math.abs(
            node.weighted_n_samples - node.n_samples
        );
        // Only show if there's a meaningful difference
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${node.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    if (!node.is_leaf) {
        // Add class distribution if available (summarized)
        if (node.value && node.value.length > 0 && node.value[0].length > 0) {
            const valueArray = node.value[0];
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

// Tooltip functionality
export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "decision-tree-tooltip")
        .style("opacity", 0);
}

export function showTooltip(event, nodeId, tooltip) {
    const node = getNodeById(nodeId);
    if (!node) return;

    // Use the enhanced tooltip content creation logic
    const content = createNodeTooltipContent(node);
    
    // Convert content array to HTML
    const html = content.join("<br>");

    tooltip
        .html(html)
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`)
        .transition()
        .duration(ANIMATION_CONFIG.tooltipShowDuration)
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(ANIMATION_CONFIG.tooltipHideDuration).style("opacity", 0);
}

// Convert blocks tree node data to the format expected by the highlighting system
function convertToTreeNodeFormat(blocksNodeData) {
    const node = getNodeById(blocksNodeData.id);
    if (!node) return null;

    // Create a mock tree node that matches the classic tree structure
    return {
        data: node,
        // Add any other properties needed by the highlighting system
    };
}

// Handle node clicks in the blocks tree
export function handleNodeClick(event, blocksNodeData, container, treeVis, scatterPlotVis) {
    event.stopPropagation();

    // Convert blocks node data to tree node format
    const treeNode = convertToTreeNodeFormat(blocksNodeData);
    if (!treeNode) return;

    // Get the blocks tree visualization
    const blocksTreeVis = getBlocksTreeVisualization();
    
    // Create a mock metrics object for the highlighting system
    const mockMetrics = {
        nodeBorderStrokeWidth: 2,
        linkStrokeWidth: 2
    };

    // Use the existing tree node click handler with blocks tree adaptation
    handleTreeNodeClick(
        event,
        treeNode,
        container,
        treeVis,
        scatterPlotVis,
        mockMetrics,
        blocksTreeVis
    );
}

// Highlight a specific node in blocks tree
export function highlightBlocksTreeNode(blocksTreeVis, nodeId) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    blocksTreeVis.container
        .selectAll(".node")
        .filter((d) => d.id === nodeId)
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", "3px");
}

// Highlight a path in blocks tree
export function highlightBlocksTreePath(blocksTreeVis, pathNodeIds) {
    if (!blocksTreeVis || !blocksTreeVis.container || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightBlocksTreeNode(blocksTreeVis, nodeId);
    });

    // Highlight links in the path
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const sourceId = pathNodeIds[i];
        const targetId = pathNodeIds[i + 1];

        blocksTreeVis.container
            .selectAll(".link")
            .filter((d) => {
                return (d.sourceId === sourceId && d.targetId === targetId) ||
                       (d.sourceId === targetId && d.targetId === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", "4px");
    }
}

// Highlight descendants of a node (for split nodes)
export function highlightBlocksTreeDescendants(blocksTreeVis, nodeId) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    const node = getNodeById(nodeId);
    if (!node) return;

    // Get all descendant node IDs
    const descendants = [];
    
    function collectDescendants(currentNodeId) {
        const currentNode = getNodeById(currentNodeId);
        if (!currentNode) return;
        
        descendants.push(currentNodeId);
        
        // Find children in the hierarchy
        const hierarchyNode = findHierarchyNode(currentNodeId);
        if (hierarchyNode && hierarchyNode.children) {
            hierarchyNode.children.forEach(child => {
                collectDescendants(child.data.node_id);
            });
        }
    }

    collectDescendants(nodeId);

    // Highlight all descendant nodes
    descendants.forEach(descendantId => {
        highlightBlocksTreeNode(blocksTreeVis, descendantId);
    });

    // Highlight all links between descendants
    descendants.forEach(sourceId => {
        descendants.forEach(targetId => {
            if (sourceId !== targetId) {
                blocksTreeVis.container
                    .selectAll(".link")
                    .filter((d) => {
                        return (d.sourceId === sourceId && d.targetId === targetId) ||
                               (d.sourceId === targetId && d.targetId === sourceId);
                    })
                    .style("stroke", colorScheme.ui.highlight)
                    .style("stroke-width", "3px");
            }
        });
    });
}

// Helper function to find hierarchy node by ID
function findHierarchyNode(nodeId) {
    const root = state.hierarchyRoot;
    if (!root) return null;

    function search(node) {
        if (node.data.node_id === nodeId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = search(child);
                if (found) return found;
            }
        }
        return null;
    }

    return search(root);
}