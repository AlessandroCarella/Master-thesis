/**
 * @fileoverview Voronoi diagram utilities for visualizing decision boundaries in scatter plots
 * @module voronoi
 * @author Generated documentation
 */

import { colorScheme } from "../visualizationConnector.js";

/**
 * Draws Voronoi diagram regions representing decision boundaries
 * @description Creates colored polygons showing classification regions with class-specific colors and transparency
 * @param {d3.Selection} g - D3 selection of the SVG group element to append regions to
 * @param {Object} data - Data object containing decision boundary information
 * @param {Object} data.decisionBoundary - Decision boundary data structure
 * @param {Array<Array<Array<number>>>} data.decisionBoundary.regions - Array of polygon vertex arrays for each region
 * @param {Array<string|number>} data.decisionBoundary.regionClasses - Array of class labels corresponding to each region
 * @param {d3.ScaleLinear} x - D3 scale function for x-axis coordinate transformation
 * @param {d3.ScaleLinear} y - D3 scale function for y-axis coordinate transformation
 * @param {Object} colorMap - Mapping from class labels to color values
 * @returns {void}
 * @example
 * drawVoronoi(svgGroup, {
 *   decisionBoundary: {
 *     regions: [[[0,0], [1,0], [1,1], [0,1]], [[1,0], [2,0], [2,1], [1,1]]],
 *     regionClasses: ["class_A", "class_B"]
 *   }
 * }, xScale, yScale, { "class_A": "red", "class_B": "blue" });
 */
export function drawVoronoi(g, data, x, y, colorMap) {
    const voronoiGroup = g.append("g").attr("class", "voronoi-regions");

    data.decisionBoundary.regions.forEach((polygon, i) => {
        const regionClass = data.decisionBoundary.regionClasses[i];
        const regionColor = colorMap[regionClass];

        voronoiGroup
            .append("polygon")
            .attr(
                "points",
                polygon.map((d) => `${x(d[0])},${y(d[1])}`).join(" ")
            )
            .attr("fill", regionColor)
            .attr("stroke", colorScheme.ui.linkStroke)
            .attr("stroke-width", colorScheme.stroke.voronoi)
            .attr("opacity", colorScheme.opacity.voronoi);
    });
}
