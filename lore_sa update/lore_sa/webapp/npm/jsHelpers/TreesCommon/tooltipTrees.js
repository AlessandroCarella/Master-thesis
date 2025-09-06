// Updated tooltip.js for TreesCommon
import { TREES_SETTINGS } from "./settings.js";
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";

function createNodeTooltipContent(nodeData, treeKind, featureMappingInfo) {
    const content = [];

    // Get actual node data based on tree type
    const node = treeKind === TREES_SETTINGS.treeKindID.blocks ? nodeData : nodeData.data;
    
    if (!node) {
        content.push("<strong>Error:</strong> No node data available");
        return content;
    }

    // Create feature decoder
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);

    // Node type and primary information
    if (node.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${node.class_label}`);
    } else {
        // Split node information - decode the split condition
        const encodedFeatureName = node.feature_name;
        const threshold = node.threshold;
        
        try {
            // Use decoder to create human-readable split condition
            const decodedCondition = decoder.decodeTreeSplitCondition(encodedFeatureName, threshold, true);
            content.push(`<strong>Split:</strong> ${decodedCondition}`);            
        } catch (error) {
            console.warn("Error decoding split condition:", error);
            // Fallback to encoded display
            content.push(`<strong>Split:</strong> ${encodedFeatureName} ≤ ${threshold.toFixed(1)}`);
            content.push("<strong>Logic:</strong> Left ≤ threshold, Right > threshold");
        }
        
        content.push(`<strong>Feature Index:</strong> ${node.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${node.n_samples}`);

    // Add weighted samples if available and different
    if (node.weighted_n_samples) {
        const weightDiff = Math.abs(node.weighted_n_samples - node.n_samples);
        if (weightDiff > 0.01) {
            content.push(`<strong>Weighted Samples:</strong> ${node.weighted_n_samples.toFixed(2)}`);
        }
    }

    if (!node.is_leaf) {
        // Add class distribution if available
        if (node.value && node.value.length > 0 && node.value[0].length > 0) {
            const valueArray = node.value[0];
            if (valueArray.length > 1) {
                const total = valueArray.reduce((sum, val) => sum + val, 0);
                const distribution = valueArray
                    .map((val) => ((val / total) * 100).toFixed(1) + "%")
                    .join(", ");
                content.push(`<strong>Class Distribution:</strong> [${distribution}]`);
            }
        }
    }

    // Add tree-specific information
    if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        if (nodeData.hasHiddenChildren) {
            content.push(`<strong>Subtree:</strong> Right-click to expand`);
        } else if (nodeData.isExpanded) {
            content.push(`<strong>Subtree:</strong> Right-click to collapse`);
        }
    }

    return content;
}

export function handleMouseOver(event, nodeData, tooltip, treeKind, featureMappingInfo) {
    const content = createNodeTooltipContent(nodeData, treeKind, featureMappingInfo);

    tooltip
        .html(content.join("<br>"))
        // .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(tooltip) {
    tooltip.style("visibility", "hidden");
}
