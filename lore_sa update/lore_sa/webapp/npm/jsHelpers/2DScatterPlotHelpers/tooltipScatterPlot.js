/**
 * @fileoverview Tooltip utilities for 2D scatter plot point interactions and feature display
 * @module tooltipScatterPlot
 * @author Generated documentation
 */

import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";

/**
 * Creates a tooltip element for scatter plot point interactions
 * @description Generates a D3-managed tooltip div with appropriate CSS class
 * @returns {d3.Selection} D3 selection of the created tooltip element
 * @example
 * const tooltip = createTooltip();
 */
export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "scatter-plot-tooltip");
}

/**
 * Shows tooltip with decoded feature information for a scatter plot point
 * @description Displays point features, decoding encoded values back to original feature names and values
 * @param {Event} event - Mouse event object containing position coordinates
 * @param {Object} data - Complete scatter plot data object
 * @param {Array<Object>} data.originalData - Original feature data for each point
 * @param {Array<string|number>} data.targets - Target class labels for each point
 * @param {d3.Selection} tooltip - D3 selection of tooltip element to show
 * @param {number} index - Index of the point to show tooltip for
 * @param {Object} featureMappingInfo - Feature mapping information for decoding
 * @param {string[]} [featureMappingInfo.encodedFeatureNames] - Names of encoded features
 * @returns {void}
 * @throws {Error} Logs warning and falls back to encoded features if decoding fails
 * @example
 * showTooltip(mouseEvent, scatterData, tooltipElement, 5, mappingInfo);
 */
export function showTooltip(event, data, tooltip, index, featureMappingInfo) {
    const encodedData = data.originalData[index];
    const target = data.targets[index];
    
    let content = `<div class="tooltip-content">`;
    
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);
    
    if (encodedData && typeof encodedData === 'object') {
        try {
            const decodedData = decoder.decodeScatterPointData(encodedData);
            content += "<strong>Features:</strong>";
            content += `<div class="tooltip-features">`;
            
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
            
            content += "<strong>Encoded features:</strong>";
            content += `<div class="tooltip-features">`;
            
            if (Array.isArray(encodedData)) {
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

/**
 * Updates tooltip position to follow mouse movement
 * @description Moves tooltip to track with mouse cursor during hover
 * @param {Event} event - Mouse move event containing new position coordinates
 * @param {d3.Selection} tooltip - D3 selection of tooltip element to reposition
 * @returns {void}
 * @example
 * element.on("mousemove", (event) => handleMouseMove(event, tooltip));
 */
export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

/**
 * Hides the tooltip by setting visibility to hidden
 * @description Conceals tooltip when mouse leaves point area
 * @param {d3.Selection} tooltip - D3 selection of tooltip element to hide
 * @returns {void}
 * @example
 * element.on("mouseout", () => hideTooltip(tooltip));
 */
export function hideTooltip(tooltip) {
    tooltip.style("visibility", "hidden");
}
