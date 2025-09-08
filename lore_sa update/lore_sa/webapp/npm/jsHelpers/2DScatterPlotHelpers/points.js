/**
 * @fileoverview Point creation and interaction utilities for 2D scatter plot visualizations
 * @module points
 * @author Generated documentation
 */

import { TREES_SETTINGS } from "../TreesCommon/settings.js";
import { getTreeState } from "../TreesCommon/state.js";
import { colorScheme } from "../visualizationConnector.js";
import { showTooltip, hideTooltip, handleMouseMove } from "./tooltipScatterPlot.js";
import { togglePointColor } from "./tree.js";
import { setOriginalPointsNeighPointsBoolArray } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";

/**
 * Creates interactive points for the 2D scatter plot with tooltips and highlighting
 * @description Generates SVG path elements for data points with different symbols for instances vs neighborhoods
 * @param {d3.Selection} g - D3 selection of the SVG group element to append points to
 * @param {Object} data - Data object containing points, targets, and metadata
 * @param {Array<Array<number>>} data.transformedData - 2D coordinates for each point [x, y]
 * @param {Array<string|number>} data.targets - Target class labels for each point
 * @param {Array<Object>} data.originalData - Original feature data for each point
 * @param {Array<boolean>} data.originalPointsNeighPointsBoolArray - Boolean array indicating original vs generated points
 * @param {Object} colorMap - Mapping from target classes to color values
 * @param {d3.Selection} tooltip - D3 selection of tooltip element for mouseover interactions
 * @param {d3.ScaleLinear} x - D3 scale function for x-axis positioning
 * @param {d3.ScaleLinear} y - D3 scale function for y-axis positioning
 * @returns {d3.Selection} D3 selection of created point elements
 * @example
 * const points = createPoints(
 *   svgGroup, 
 *   scatterData, 
 *   { 0: "red", 1: "blue" }, 
 *   tooltipElement, 
 *   xScale, 
 *   yScale
 * );
 */
export function createPoints(
    g,
    data,
    colorMap,
    tooltip,
    x,
    y
) {
    setOriginalPointsNeighPointsBoolArray(
        data.originalPointsNeighPointsBoolArray
    );

    const defaultSymbolSize = 100;
    const starSymbolSize = defaultSymbolSize * 3; 

    const instanceIndex = data.transformedData.length - 1;
    
    const points = g
        .selectAll("path.point")
        .data(data.transformedData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", (d, i) => {
            const size = i === instanceIndex ? starSymbolSize : defaultSymbolSize;
            return d3
                .symbol()
                .size(size)
                .type(i === instanceIndex ? d3.symbolStar : d3.symbolCircle)();
        })
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", colorScheme.stroke.points2DScatterPlot)
        .style("opacity", (d, i) =>
            data.originalPointsNeighPointsBoolArray[i]
                ? colorScheme.opacity.datasetPoint
                : colorScheme.opacity.neighPoint
        )
        .on("mouseover", (event, d, i) => {
            const index = d3.select(event.currentTarget).datum() ? 
                data.transformedData.findIndex(point => point === d) : 
                Array.from(event.currentTarget.parentNode.children).indexOf(event.currentTarget);
            
            const featureMappingInfo = getTreeState(TREES_SETTINGS.treeKindID.classic).featureMappingInfo;
            showTooltip(event, data, tooltip, index, featureMappingInfo);
            d3.select(event.currentTarget).style(
                "stroke",
                colorScheme.ui.highlight
            );
        })
        .on("mouseout", (event) => {
            hideTooltip(tooltip);
            d3.select(event.currentTarget).style(
                "stroke",
                colorScheme.ui.nodeStroke
            );
        })
        .on("mousemove", (event) => {
            handleMouseMove(event, tooltip);
        })
        .on("click", function (event, d) {
            togglePointColor(this, d, data, colorMap);
        });

    return points;
}
