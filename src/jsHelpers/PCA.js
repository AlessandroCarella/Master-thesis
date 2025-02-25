// pcaScatterPlot.js

import {
    setPCAVisualization,
    getGlobalColorMap,
    getDatasetType,
} from "./visualizationConnector.js";
import { createTooltip } from "./PCAHelpers/tooltip.js";
import { createZoom } from "./PCAHelpers/zoom.js";
import { createAxes } from "./PCAHelpers/axis.js";
import { drawVoronoi } from "./PCAHelpers/voronoi.js";
import { createPoints } from "./PCAHelpers/points.js";

// Main function to create the PCA scatter plot
export function createPCAscatterPlot(data, container, treeVis, datasetType) {
    if (
        !data ||
        !data.pcaData ||
        !data.targets ||
        !data.decisionBoundary ||
        !data.originalData
    ) {
        console.error("Invalid PCA data structure:", data);
        return;
    }

    const treeVisualization = treeVis || window.treeVisualization;
    const visualization = { data, points: null };
    setPCAVisualization(visualization);

    const width = 800;
    const height = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const tooltip = createTooltip();

    document.getElementById("x-axis-label").textContent = datasetType === "tabular" ? data.xAxisLabel : "PCA component 1";
    document.getElementById("y-axis-label").textContent = datasetType === "tabular" ? data.yAxisLabel : "PCA component 2";

    d3.select(container).select("svg").remove();

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g");
    createZoom(svg, g, margin, width, height);

    const x = d3
        .scaleLinear()
        .domain(data.decisionBoundary.xRange)
        .range([margin.left, width - margin.right]);

    const y = d3
        .scaleLinear()
        .domain(data.decisionBoundary.yRange)
        .range([height - margin.bottom, margin.top]);

    // Use consistent color scheme
    const colorMap = getGlobalColorMap();

    // Draw Voronoi regions with updated colors
    drawVoronoi(g, data, x, y, colorMap);
    createAxes(g, x, y, margin, width, height);

    visualization.points = createPoints(
        g,
        data,
        x,
        y,
        colorMap,
        tooltip,
        treeVisualization,
        datasetType,
    );

    return visualization;
}
