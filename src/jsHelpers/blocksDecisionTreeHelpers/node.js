import { state } from "./state.js";
import { DEFAULT_COLORS, SPLIT_NODE_COLOR, ANIMATION_CONFIG } from "./settings.js";
import { getTreeStats, getUniqueClasses } from "./metrics.js";

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

export function getNodeColor(nodeId) {
    const node = getNodeById(nodeId);
    if (!node) return SPLIT_NODE_COLOR;
    if (node.is_leaf) {
        const cls = node.class_label || "unknown";
        const unique = getUniqueClasses();
        const idx = unique.indexOf(cls);
        return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    }
    return SPLIT_NODE_COLOR;
}

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

// Enhanced tooltip content creation function (adapted from first file)
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