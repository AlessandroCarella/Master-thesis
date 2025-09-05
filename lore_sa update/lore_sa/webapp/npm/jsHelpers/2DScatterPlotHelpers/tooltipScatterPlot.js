// Updated tooltip.js for 2DScatterPlotHelpers
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";

export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "scatter-plot-tooltip");
}

export function showTooltip(event, data, tooltip, index, featureMappingInfo) {
    // Get the original data for this point using the provided index
    const encodedData = data.originalData[index];
    const target = data.targets[index];
    
    let content = `<div class="tooltip-content">`;
    
    // Create feature decoder with original instance data
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);
    
    if (encodedData && typeof encodedData === 'object') {
        try {
            // Decode the encoded features to show original feature names and values
            const decodedData = decoder.decodeScatterPointData(encodedData);
            content += "<strong>Features:</strong>";
            content += `<div class="tooltip-features">`;
            
            // Show decoded features
            Object.entries(decodedData).forEach(([originalFeatureName, decodedValue]) => {
                let displayValue;
                
                if (typeof decodedValue === 'number') {
                    displayValue = Number.isInteger(decodedValue) ? 
                        decodedValue.toString() : 
                        decodedValue.toFixed(3);
                } else {
                    displayValue = decodedValue.toString();
                }
                
                content += `<div class="tooltip-feature">${originalFeatureName}: ${displayValue}</div>`;
            });
            
        } catch (error) {
            console.warn("Error decoding features for tooltip:", error);
            
            // Fallback to encoded features if decoding fails
            content += "<strong>Encoded features:</strong>";
            content += `<div class="tooltip-features">`;
            
            if (Array.isArray(encodedData)) {
                // Handle array format (fallback)
                const featureNames = featureMappingInfo?.encodedFeatureNames || 
                    encodedData.map((_, i) => `Feature ${i}`);
                
                encodedData.forEach((value, i) => {
                    const featureName = featureNames[i] || `Feature ${i}`;
                    const displayValue = typeof value === 'number' ? 
                        (Number.isInteger(value) ? value.toString() : value.toFixed(3)) :
                        value.toString();
                    content += `<div class="tooltip-feature">${featureName}: ${displayValue}</div>`;
                });
            } else {
                // Handle dictionary format - show encoded features
                Object.entries(encodedData).forEach(([featureName, value]) => {
                    let displayValue;
                    if (typeof value === 'number') {
                        displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(3);
                    } else {
                        displayValue = value.toString();
                    }
                    
                    content += `<div class="tooltip-feature">${featureName}: ${displayValue}</div>`;
                });
            }
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

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function hideTooltip(tooltip) {
    tooltip.style("visibility", "hidden");
}
