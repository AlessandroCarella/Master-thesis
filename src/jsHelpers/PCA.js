export { createPCAscatterPlot };
import { setPCAVisualization, colorScheme, generateColorMap } from './visualizationConnector.js';

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
        voronoiGroup
            .append("polygon")
            .attr(
                "points",
                polygon.map((d) => `${x(d[0])},${y(d[1])}`).join(" ")
            )
            .attr("fill", colorMap[data.decisionBoundary.regionClasses[i]])
            .attr("stroke", colorScheme.ui.linkStroke)
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);
    });
}

// Function to find the leaf node in the decision tree that a point belongs to
function findLeafNodeForPoint(point, treeData, originalFeatures) {
    let currentNode = treeData;

    while (currentNode && !currentNode.data.is_leaf) {
        const featureName = currentNode.data.feature_name;
        const threshold = currentNode.data.threshold;
        const featureValue = originalFeatures[featureName];

        if (featureValue <= threshold) {
            currentNode = currentNode.children[0]; // Go left
        } else {
            currentNode = currentNode.children[1]; // Go right
        }
    }

    return currentNode;
}

// Function to highlight the decision path in the tree
function highlightDecisionPath(point, data, treeVisualization) {
    if (!treeVisualization || !treeVisualization.contentGroup) return;

    // First, reset all highlights
    treeVisualization.contentGroup
        .selectAll(".link")
        .style("stroke", "#ccc")
        .style(
            "stroke-width",
            `${treeVisualization.metrics.linkStrokeWidth}px`
        );

    treeVisualization.contentGroup
        .selectAll(".node circle")
        .style("stroke", "#ccc")
        .style(
            "stroke-width",
            `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
        );

    // Find the corresponding leaf node
    const leafNode = findLeafNodeForPoint(
        point,
        treeVisualization.treeData,
        data.originalData[data.pcaData.indexOf(point)]
    );

    if (leafNode) {
        // Highlight the path from leaf to root
        let currentNode = leafNode;
        while (currentNode.parent) {
            // Highlight the link
            treeVisualization.contentGroup
                .selectAll(".link")
                .filter(
                    (linkData) =>
                        linkData.source === currentNode.parent &&
                        linkData.target === currentNode
                )
                .style("stroke", "red")
                .style(
                    "stroke-width",
                    `${treeVisualization.metrics.linkStrokeWidth}px`
                );

            // Highlight the node
            treeVisualization.contentGroup
                .selectAll(".node")
                .filter((d) => d === currentNode)
                .select("circle")
                .style("stroke", "red")
                .style(
                    "stroke-width",
                    `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
                );

            currentNode = currentNode.parent;
        }
    }
}

// Create points with event handlers
function createPoints(g, data, x, y, colorMap, tooltip, treeVisualization) {
    const symbolGenerator = d3.symbol().size(100);
    let lastClickedPoint = null;

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

    treeVisualization.contentGroup
        .selectAll(".link")
        .style("stroke", "#ccc")
        .style(
            "stroke-width",
            `${treeVisualization.metrics.linkStrokeWidth}px`
        );

    treeVisualization.contentGroup
        .selectAll(".node circle")
        .style("stroke", "#ccc")
        .style(
            "stroke-width",
            `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
        );
}

function highlightTreePath(path, treeVisualization) {
    // Reset previous highlights
    resetTreeHighlights(treeVisualization);

    // Highlight the path
    for (let i = 0; i < path.length - 1; i++) {
        treeVisualization.contentGroup
            .selectAll(".link")
            .filter(
                (linkData) =>
                    linkData.source === path[i] &&
                    linkData.target === path[i + 1]
            )
            .style("stroke", "red")
            .style(
                "stroke-width",
                `${treeVisualization.metrics.linkStrokeWidth}px`
            );
    }

    // Highlight the leaf node
    if (path.length > 0) {
        treeVisualization.contentGroup
            .selectAll(".node")
            .filter((d) => d === path[path.length - 1])
            .select("circle")
            .style("stroke", "red")
            .style(
                "stroke-width",
                `${treeVisualization.metrics.nodeBorderStrokeWidth}px`
            );
    }
}

let lastClickedNode = null; // Declare globally
// Toggle point color on click
function togglePointColor(node, d, data, colorMap, treeVisualization) {
    const index = data.pcaData.indexOf(d);
    const originalFeatures = data.originalData[index];

    if (lastClickedPoint) {
        d3.select(lastClickedPoint).style(
            "fill",
            color(data.targets[data.pcaData.indexOf(lastClickedPoint.__data__)])
        );
    }

    if (lastClickedPoint === node) {
        lastClickedPoint = null;
        if (treeVisualization) {
            resetTreeHighlights(treeVisualization);
        }
        return;
    }

    lastClickedPoint = node;
    d3.select(node).style("fill", colorScheme.ui.highlight);

    if (treeVisualization && treeVisualization.treeData) {
        highlightTreePath(
            findTreePath(originalFeatures, treeVisualization),
            treeVisualization
        );
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
    const colorMap = generateColorMap(uniqueClasses);

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
