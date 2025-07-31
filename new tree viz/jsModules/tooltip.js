import { getNodeById, getTreeStats } from "./treeModel.js";

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
        .duration(200)
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}
