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

    let html = '<div class="tooltip-header">';
    if (node.is_leaf) {
        html += `<strong>Leaf Node: ${
            node.class_label || "Unknown"
        }</strong></div>`;
    } else {
        html += `<strong>Split: ${node.feature_name} > ${node.threshold}</strong></div>`;
        html += `<div class="tooltip-line">Feature Index: ${
            node.feature_index || "N/A"
        }</div>`;
        html += `<div class="tooltip-line">Impurity: ${
            node.impurity ? Number(node.impurity).toFixed(4) : "N/A"
        }</div>`;
    }

    html += `<div class="tooltip-line">Node ID: ${node.node_id}</div>`;
    html += `<div class="tooltip-line">Samples: ${node.n_samples || 0}</div>`;

    if (Array.isArray(node.value)) {
        const total = node.value.reduce((s, v) => s + v, 0) || 1;
        const percentages = node.value.map((v) =>
            ((v / total) * 100).toFixed(1)
        );
        html += '<div class="tooltip-distribution">';
        html += '<div style="font-weight: bold;">Class Distribution:</div>';
        html += `<div>[${percentages.join("%, ")}%]</div>`;
        html += "</div>";
    }

    if (node.node_id === 0) {
        const stats = getTreeStats();
        html += '<div class="tooltip-distribution">';
        html += '<div style="font-weight: bold;">Tree Statistics:</div>';
        html += `<div>Total Nodes: ${stats.totalNodes}</div>`;
        html += `<div>Leaf Nodes: ${stats.leafNodes}</div>`;
        html += `<div>Max Depth: ${stats.maxDepth}</div>`;
        html += "</div>";
    }

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