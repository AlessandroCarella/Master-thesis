import { TREES_SETTINGS } from "./settings.js";

function createNodeTooltipContent(nodeData, treeKind) {
    const content = [];

    // Get actual node data based on tree type
    const node = treeKind === TREES_SETTINGS.treeKindID.blocks ? nodeData : nodeData.data;
    
    if (!node) {
        content.push("<strong>Error:</strong> No node data available");
        return content;
    }

    // Node type and primary information
    if (node.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${node.class_label}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                node.feature_name
            } ≤ ${node.threshold.toFixed(2)}`
        );
        content.push("<strong>Nodes disposition:</strong> Left True/Right False")
        content.push(`<strong>Feature Index:</strong> ${node.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${node.n_samples}`);

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

    // Add tree-specific information
    if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        // Add subtree information for spawn trees
        if (nodeData.hasHiddenChildren) {
            content.push(`<strong>Subtree:</strong> Right-click to expand`);
        } else if (nodeData.isExpanded) {
            content.push(`<strong>Subtree:</strong> Right-click to collapse`);
        }
    }

    return content;
}

export function handleMouseOver(event, nodeData, tooltip, treeKind) {
    // Extract tooltip content creation
    const content = createNodeTooltipContent(nodeData, treeKind);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseMove(event, tooltip, treeKind) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(tooltip) {
    tooltip.style("visibility", "hidden");
}

// Get node text lines for path nodes (spawn tree specific)
export function getNodeTextLines(nodeData, instanceData, treeKind) {
    if (treeKind !== TREES_SETTINGS.treeKindID.spawn) {
        console.warn("getNodeTextLines is spawn-specific");
        return ["Node"];
    }
    
    const lines = [];
    const node = nodeData.data;
    
    if (!node.is_leaf) {
        // Decision node - show split condition and instance value
        const featureName = node.feature_name || 'Unknown';
        const threshold = node.threshold !== undefined ? node.threshold.toFixed(2) : 'N/A';
        
        // Get instance value (would need to import getInstanceValue)
        const instanceValue = instanceData && instanceData[featureName];
        
        lines.push(`${featureName} ≤ ${threshold}`);
        
        if (instanceValue !== null && instanceValue !== undefined) {
            const formattedValue = typeof instanceValue === 'number' ? instanceValue.toFixed(2) : instanceValue;
            lines.push(`Instance: ${formattedValue}`);
        }
    } else {
        // Leaf node - show class label
        lines.push(`${node.class_label}`);
    }
    
    return lines;
}

// Get node label lines for blocks tree rectangles
export function getNodeLabelLines(nodeId, instance, treeKind) {
    if (treeKind !== TREES_SETTINGS.treeKindID.blocks) {
        console.warn("getNodeLabelLines is blocks-specific");
        return [`Node ${nodeId}`];
    }
    
    // This would need to be implemented with proper node lookup
    // For now, returning a simple implementation
    return [`Node ${nodeId}`];
}