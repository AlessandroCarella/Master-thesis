import { TREES_SETTINGS } from "./settings.js";

function getFeatureDisplayName(encodedFeatureName, featureMappingInfo) {
    const { datasetDescriptor } = featureMappingInfo;
    
    // Check categorical features
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.categorical || {})) {
        if (encodedFeatureName.startsWith(originalFeatureName + '_')) {
            return originalFeatureName;
        }
    }
    
    // Check numeric features
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.numeric || {})) {
        if (encodedFeatureName === originalFeatureName) {
            return originalFeatureName;
        }
    }
    
    return encodedFeatureName;
}

function getCategoricalValueFromThreshold(encodedFeatureName, threshold, featureMappingInfo) {
    const { datasetDescriptor } = featureMappingInfo;
    
    for (const [originalFeatureName, info] of Object.entries(datasetDescriptor.categorical || {})) {
        if (encodedFeatureName.startsWith(originalFeatureName + '_')) {
            const categoryValue = encodedFeatureName.replace(originalFeatureName + '_', '');
            // For one-hot encoded features, threshold is typically 0.5
            // The split means: "Is this category active?" (> 0.5 = Yes, <= 0.5 = No)
            return {
                featureName: originalFeatureName,
                categoryValue: categoryValue,
                condition: threshold <= 0.5 ? `!= "${categoryValue}"` : `= "${categoryValue}"`
            };
        }
    }
    
    return null;
}

function createNodeTooltipContent(nodeData, treeKind, featureMappingInfo) {
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
        // Split node information with proper decoding
        const displayFeatureName = getFeatureDisplayName(node.feature_name, featureMappingInfo);
        const categoricalInfo = getCategoricalValueFromThreshold(node.feature_name, node.threshold, featureMappingInfo);
        
        if (categoricalInfo) {
            // Categorical feature split
            content.push(`<strong>Split:</strong> ${categoricalInfo.featureName} ${categoricalInfo.condition}`);
        } else {
            // Numeric feature split
            content.push(`<strong>Split:</strong> ${displayFeatureName} ≤ ${node.threshold.toFixed(2)}`);
        }
        
        content.push("<strong>Nodes disposition:</strong> Left True/Right False");
        content.push(`<strong>Feature Index:</strong> ${node.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${node.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${node.n_samples}`);

    // Add weighted samples if available
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
        .style("class", "decision-tree-tooltip")
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

// Get node text lines for path nodes (spawn tree specific)
export function getNodeTextLines(nodeData, treeKind, featureMappingInfo) {
    if (treeKind !== TREES_SETTINGS.treeKindID.spawn) {
        console.warn("getNodeTextLines is spawn-specific");
        return ["Node"];
    }
    
    const lines = [];
    const node = nodeData.data;
    
    if (!node.is_leaf) {
        const displayFeatureName = getFeatureDisplayName(node.feature_name, featureMappingInfo);
        const categoricalInfo = getCategoricalValueFromThreshold(node.feature_name, node.threshold, featureMappingInfo);
        
        if (categoricalInfo) {
            lines.push(`${categoricalInfo.featureName} ${categoricalInfo.condition}`);
        } else {
            const threshold = node.threshold.toFixed(2);
            lines.push(`${displayFeatureName} ≤ ${threshold}`);
        }
    } else {
        lines.push(`${node.class_label}`);
    }
    
    return lines;
}
