export { createPCAscatterPlot };
import { setPCAVisualization, colorScheme, generateColorMap, getGlobalColorMap, setGlobalColorMap } from './visualizationConnector.js';

// Create tooltip
function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "pca-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "12px")
        .style("pointer-events", "none")
        .style("max-width", "300px")
        .style("font-size", "12px")
        .style("line-height", "1.4");
}

// Create the zoom behavior
function createZoom(svg, g, margin, width, height) {
    const initialZoom = d3.zoomIdentity;
    const zoom = d3
        .zoom()
        .scaleExtent([initialZoom.k, 5])
        .translateExtent([
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom],
        ])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
}

// Create axes
function createAxes(g, x, y, margin, width, height) {
    // X-axis
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10))
        .call((g) => g.select(".domain").remove()) // Remove axis line
        .call((g) => g.selectAll(".tick line").remove()); // Remove tick lines

    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(10))
        .call((g) => g.select(".domain").remove()) // Remove axis line
        .call((g) => g.selectAll(".tick line").remove()); // Remove tick lines
}

// Create the Voronoi regions for the decision boundaries
function drawVoronoi(g, data, x, y, colorMap) {
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
            .attr("fill", regionColor) // Use the class-specific color
            .attr("stroke", colorScheme.ui.linkStroke)
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.2); // Reduced opacity to make it less overwhelming
    });
}

// Create points with event handlers
function createPoints(g, data, x, y, colorMap, tooltip, treeVisualization) {
    const symbolGenerator = d3.symbol().size(100);

    const points = g
        .selectAll("path.point")
        .data(data.pcaData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", symbolGenerator.type(d3.symbolCircle))
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", 1)
        .style("opacity", colorScheme.opacity.hover)
        .on("mouseover", (event, d) => {
            showTooltip(event, d, data, tooltip);
            d3.select(event.currentTarget)
                .style("opacity", colorScheme.opacity.active)
                .style("stroke", colorScheme.ui.highlight);
        })
        .on("mouseout", (event) => {
            hideTooltip(tooltip);
            d3.select(event.currentTarget)
                .style("opacity", colorScheme.opacity.hover)
                .style("stroke", colorScheme.ui.nodeStroke);
        })
        .on("click", function (event, d) {
            togglePointColor(this, d, data, colorMap, treeVisualization);
        });

    return points;
}

// Show tooltip on hover with original data
function showTooltip(event, d, data, tooltip) {
    // Get the index of the point in pcaData
    const pointIndex = event.target.__data__
        ? data.pcaData.findIndex(
              (p) =>
                  p[0] === event.target.__data__[0] &&
                  p[1] === event.target.__data__[1]
          )
        : -1;

    if (pointIndex === -1) {
        console.warn("Could not find matching point data");
        return;
    }

    const className = data.targets[pointIndex];
    const originalData = data.originalData[pointIndex];

    // Create tooltip content
    let tooltipContent = "<strong>Decoded Values:</strong><br>";

    // Add each feature and its value
    Object.entries(originalData).forEach(([feature, value]) => {
        tooltipContent += `${feature}: ${
            typeof value === "number" ? value.toFixed(3) : value
        }<br>`;
    });

    tooltipContent += `<strong>Class: ${className}</strong>`;

    tooltip
        .html(tooltipContent)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px")
        .transition()
        .duration(200)
        .style("opacity", 0.95);
}

// Hide tooltip
function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}

function resetTreeHighlights(treeVisualization) {
    if (!treeVisualization || !treeVisualization.contentGroup) return;

    // Reset link styles
    treeVisualization.contentGroup
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);

    // Reset node styles
    treeVisualization.contentGroup
        .selectAll(".node circle")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
}

function highlightTreePath(path, treeVisualization) {
    // Reset any previous highlights
    resetTreeHighlights(treeVisualization);

    // Highlight the links in the path
    for (let i = 0; i < path.length - 1; i++) {
        const currentNode = path[i];
        const nextNode = path[i + 1];

        treeVisualization.contentGroup
            .selectAll(".link")
            .filter(linkData => 
                linkData.source === currentNode && 
                linkData.target === nextNode
            )
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);
    }

    // Highlight all nodes in the path
    path.forEach(node => {
        treeVisualization.contentGroup
            .selectAll(".node")
            .filter(d => d === node)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
    });
}

function findTreePath(features, root) {
    let path = [];
    let currentNode = root.treeData.descendants()[0]; // Start at root

    while (currentNode) {
        path.push(currentNode);
        
        // If we've reached a leaf node, stop
        if (currentNode.data.is_leaf) {
            break;
        }

        // Get the feature value for the current split
        const featureValue = features[currentNode.data.feature_name];
        
        // Decide which child to traverse to
        if (featureValue <= currentNode.data.threshold) {
            currentNode = currentNode.children?.[0] || null; // Left child
        } else {
            currentNode = currentNode.children?.[1] || null; // Right child
        }
    }

    return path;
}

// Toggle point color on click
function togglePointColor(node, d, data, colorMap, treeVisualization) {
    // Reset all points to their original colors first
    d3.selectAll("path.point")
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("opacity", colorScheme.opacity.hover);

    const index = data.pcaData.indexOf(d);
    const originalFeatures = data.originalData[index];
    
    // If clicking the same point, reset everything and exit
    if (window.lastClickedPoint === node) {
        window.lastClickedPoint = null;
        resetTreeHighlights(treeVisualization);
        return;
    }

    // Update the last clicked point and highlight only this point
    window.lastClickedPoint = node;
    d3.select(node)
        .style("fill", colorScheme.ui.highlight)
        .style("opacity", colorScheme.opacity.active);

    // Find and highlight the corresponding path in the decision tree
    if (treeVisualization && treeVisualization.treeData) {
        const path = findTreePath(originalFeatures, treeVisualization);
        highlightTreePath(path, treeVisualization);
    }
}

// Create the PCA scatter plot
function createPCAscatterPlot(data, container, treeVis) {
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

    document.getElementById("x-axis-label").textContent = data.xAxisLabel;
    document.getElementById("y-axis-label").textContent = data.yAxisLabel;

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
    const uniqueClasses = Array.from(new Set(data.targets));
    const colorMap = getGlobalColorMap() || setGlobalColorMap(uniqueClasses);

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
        treeVisualization
    );

    return visualization;
}
