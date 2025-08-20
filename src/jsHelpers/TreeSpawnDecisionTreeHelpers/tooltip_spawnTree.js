import { isNodeInPath } from "./instancePath_spawnTree.js";

// Function to create tooltip content for a node
export function createNodeTooltipContent(d, instancePath = []) {
    const content = [];

    // Node type and primary information
    if (d.data.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${d.data.class_label}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                d.data.feature_name
            } ≤ ${d.data.threshold.toFixed(2)}`
        );
        content.push(`<strong>Feature Index:</strong> ${d.data.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${d.data.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${d.data.n_samples}`);

    // Add weighted samples if available
    if (d.data.weighted_n_samples) {
        const weightDiff = Math.abs(
            d.data.weighted_n_samples - d.data.n_samples
        );
        // Only show if there's a meaningful difference
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${d.data.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    if (!d.data.is_leaf) {
        // Add class distribution if available (summarized)
        if (d.data.value && d.data.value.length > 0 && d.data.value[0].length > 0) {
            const valueArray = d.data.value[0];
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

    // Add subtree information
    if (d.hasHiddenChildren) {
        content.push(`<strong>Subtree:</strong> Right-click to expand`);
    } else if (d.isExpanded) {
        content.push(`<strong>Subtree:</strong> Right-click to collapse`);
    }

    return content;
}

// Handle mouse over event for tooltips
export function handleMouseOver(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    // Extract tooltip content creation to a separate function
    const content = createNodeTooltipContent(d, instancePath);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget).style("stroke", SETTINGS.visual.colors.highlight);
}

// Handle mouse move event for tooltips
export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

// Handle mouse out event for tooltips
export function handleMouseOut(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    tooltip.style("visibility", "hidden");
    
    const isInPath = isNodeInPath(d.data.node_id, instancePath);
    const strokeColor = isInPath ? SETTINGS.visual.colors.pathHighlightStroke : SETTINGS.visual.colors.nodeStroke;
    const strokeWidth = isInPath ? `${metrics.nodeBorderStrokeWidth * SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px` : `${metrics.nodeBorderStrokeWidth}px`;
    const opacity = isInPath ? SETTINGS.visual.opacity.pathHighlight : SETTINGS.visual.opacity.normal;
    
    d3.select(event.currentTarget)
        .style("stroke", strokeColor)
        .style("stroke-width", strokeWidth)
        .style("opacity", opacity);
}