// scatterPlot.js

import {
    setScatterPlotVisualization,
} from "./visualizationConnector.js";
import { createTooltip } from "./2DScatterPlotHelpers/tooltip.js";
import { createZoom } from "./2DScatterPlotHelpers/zoom.js";
import { drawVoronoi } from "./2DScatterPlotHelpers/voronoi.js";
import { createPoints } from "./2DScatterPlotHelpers/points.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";

// Main function to create the scatter plot
export function createScatterPlot(data, treeVis, container) {
    if (!data || !data.transformedData || !data.targets || !data.originalData) {
        console.error("Invalid scatter plot data structure:", data);
        return;
    }

    const treeVisualization = treeVis || window.treeVisualization;
    const visualization = { data, points: null };
    setScatterPlotVisualization(visualization);

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

    // Use consistent color scheme
    const colorMap = getGlobalColorMap();

    const x = d3
        .scaleLinear()
        .domain(data.decisionBoundary.xRange)
        .range([margin.left, width - margin.right]);

    const y = d3
        .scaleLinear()
        .domain(data.decisionBoundary.yRange)
        .range([height - margin.bottom, margin.top]);

    // Only draw Voronoi regions for PCA
    if (data.method.toUpperCase() === "PCA") {
        drawVoronoi(g, data, x, y, colorMap);
    }

    visualization.points = createPoints(
        g,
        data,
        colorMap,
        tooltip,
        treeVisualization,
        x,
        y
    );

    return visualization;
}
