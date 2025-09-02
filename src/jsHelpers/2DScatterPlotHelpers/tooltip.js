import { colorScheme } from "../visualizationConnectorHelpers/colors.js";

export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "scatter-plot-tooltip");
}

export function showTooltip(event, data, tooltip, index, featureMappingInfo) {
    // Get the original data for this point using the provided index
    const originalData = data.originalData[index];
    const target = data.targets[index];
    
    let content = `<div class="tooltip-content">`;
    content += "<strong>Decoded values:</strong>"
    content += `<div class="tooltip-features">`;
    
    // Handle both dictionary and array formats properly
    if (originalData && typeof originalData === 'object') {
        if (Array.isArray(originalData)) {
            // Handle array format (fallback)
            const featureNames = featureMappingInfo?.originalFeatureNames || 
            Object.keys(featureMappingInfo?.datasetDescriptor?.numeric || {}).concat(
                Object.keys(featureMappingInfo?.datasetDescriptor?.categorical || {})
            ) || 
            originalData.map((_, i) => `Feature ${i}`);
            
            originalData.forEach((value, i) => {
                const featureName = featureNames[i] || `Feature ${i}`;
                const displayValue = value;
                content += `<div class="tooltip-feature">${featureName}: ${displayValue}</div>`;
            });
        } else {
            // Handle dictionary format (preferred)
            Object.entries(originalData).forEach(([featureName, value]) => {
                // Handle different value types
                let displayValue;
                if (typeof value === 'number') {
                    displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(3);
                } else {
                    displayValue = value.toString();
                }
                
                content += `<div class="tooltip-feature">${featureName}: ${displayValue}</div>`;
            });
        }
    } else {
        content += `<div class="tooltip-feature">No feature data available</div>`;
    }
    
    content += `</div>`;
    content += `<div class="tooltip-target"><strong>Class: ${target}</strong></div>`;
    content += `</div>`;

    tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible")
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", colorScheme.opacity.hidden);
}
