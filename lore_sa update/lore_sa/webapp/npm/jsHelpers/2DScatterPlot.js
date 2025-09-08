/**
 * @fileoverview Creates 2D scatter plot visualization with interaction capabilities.
 * Supports PCA and UMAP dimensionality reduction methods with Voronoi diagrams and point highlighting.
 * @author Generated documentation
 * @module ScatterPlot2D
 */

import { createTooltip } from "./2DScatterPlotHelpers/tooltipScatterPlot.js";
import { createZoom } from "./2DScatterPlotHelpers/zoom.js";
import { drawVoronoi } from "./2DScatterPlotHelpers/voronoi.js";
import { createPoints } from "./2DScatterPlotHelpers/points.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { registerScatterPlot } from "./visualizationConnectorHelpers/HighlightingCoordinator.js";

/**
 * @typedef {Object} ScatterPlotData
 * @property {Array<Array<number>>} transformedData - Dimensionally reduced coordinates
 * @property {Array<number>} targets - Class labels for each point
 * @property {Array<Object>} originalData - Original data points before transformation
 * @property {Object} decisionBoundary - Boundary information with x/y ranges
 * @property {string} method - Dimensionality reduction method used
 */

/**
 * @typedef {Object} ScatterPlotVisualization
 * @property {ScatterPlotData} data - Visualization data
 * @property {d3.Selection} points - D3 selection of scatter plot points
 */

/**
 * Creates a 2D scatter plot visualization with zoom, tooltips, and highlighting capabilities.
 * Registers the visualization with the highlighting coordinator for cross-visualization interaction.
 * 
 * @param {ScatterPlotData} data - Complete scatter plot data including transformed coordinates
 * @param {Object} [treeVis] - Optional tree visualization for interaction
 * @param {string} container - CSS selector for the container element
 * @returns {ScatterPlotVisualization} Complete visualization object
 * @throws {Error} When data structure is invalid or container not found
 * @example
 * const scatterViz = createScatterPlot({
 *   transformedData: [[1.2, 0.8], [2.1, 1.5]],
 *   targets: [0, 1],
 *   originalData: [{ feature1: 1.0 }, { feature1: 2.0 }],
 *   decisionBoundary: { xRange: [0, 3], yRange: [0, 2] },
 *   method: 'PCA'
 * }, treeVis, '#scatter-plot');
 * 
 * @see createTooltip
 * @see createZoom
 * @see createPoints
 * @see registerScatterPlot
 */
export function createScatterPlot(data, treeVis, container) {
    if (!data || !data.transformedData || !data.targets || !data.originalData) {
        console.error("Invalid scatter plot data structure:", data);
        return;
    }

    const treeVisualization = treeVis || window.treeVisualization;
    const visualization = { data, points: null };
    registerScatterPlot(visualization);

    const width = 800;
    const height = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const tooltip = createTooltip();

    d3.select(container).select("svg").remove();

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g");
    createZoom(svg, g, margin, width, height);

    const colorMap = getGlobalColorMap();

    const x = d3
        .scaleLinear()
        .domain(data.decisionBoundary.xRange)
        .range([margin.left, width - margin.right]);

    const y = d3
        .scaleLinear()
        .domain(data.decisionBoundary.yRange)
        .range([height - margin.bottom, margin.top]);

    if (data.method.toUpperCase() === "PCA") {
        drawVoronoi(g, data, x, y, colorMap);
    }

    visualization.points = createPoints(
        g,
        data,
        colorMap,
        tooltip,
        x,
        y
    );

    return visualization;
}
