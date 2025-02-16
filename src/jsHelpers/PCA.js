export {
    initialize as initializeScatterPlot,
    createPCAscatterPlot,
    fetchData as fetchScatterData
};

// Fetch data from the FastAPI backend
async function fetchData() {
    const response = await fetch("http://localhost:8000/api/pca-data");
    return await response.json();
}

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
        .style("padding", "8px")
        .style("pointer-events", "none");
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
        .call((g) => g.select(".domain").remove())  // Remove axis line
        .call((g) => g.selectAll(".tick line").remove());  // Remove tick lines

    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(10))
        .call((g) => g.select(".domain").remove())  // Remove axis line
        .call((g) => g.selectAll(".tick line").remove());  // Remove tick lines
}

// Create the Voronoi regions for the decision boundaries
function drawVoronoi(g, data, x, y, color) {
    const voronoiGroup = g.append("g").attr("class", "voronoi-regions");

    data.decisionBoundary.regions.forEach((polygon, i) => {
        voronoiGroup
            .append("polygon")
            .attr(
                "points",
                polygon.map((d) => `${x(d[0])},${y(d[1])}`).join(" ")
            )
            .attr("fill", color(data.decisionBoundary.regionClasses[i]))
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.3);
    });
}

// Create points with event handlers
function createPoints(g, data, x, y, color, tooltip) {
    const symbolGenerator = d3.symbol().size(100);
    let lastClickedNode = null;

    g.selectAll("path.point")
        .data(data.pcaData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", symbolGenerator.type(d3.symbolCircle))
        .style("fill", (d, i) => color(data.targets[i]))
        .style("stroke", "#fff")
        .style("stroke-width", 1)
        .style("opacity", 0.8)
        .on("mouseover", (event, d, i) =>
            showTooltip(event, d, i, data, tooltip)
        )
        .on("mouseout", () => hideTooltip(tooltip))
        .on("click", function (event, d, i) {
            togglePointColor(this, d, data, color, lastClickedNode);
            lastClickedNode = this;
        });
}

// Show tooltip on hover
function showTooltip(event, d, i, data, tooltip) {
    const index = data.pcaData.indexOf(d);
    const className = data.targets[index];
    tooltip.transition().duration(200).style("opacity", 0.9);
    tooltip
        .html(`Class: ${className}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
}

// Hide tooltip
function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}

let lastClickedNode = null; // Declare globally
// Toggle point color on click
function togglePointColor(node, d, data, color) {
    const index = data.pcaData.indexOf(d); // Get the index of the clicked data point
    const originalColor = color(data.targets[index]); // Get original color
    const selection = d3.select(node);

    // If this node was the last clicked one, revert to original color
    if (lastClickedNode === node) {
        selection.style("fill", originalColor);
        lastClickedNode = null; // Reset last clicked node
    } else {
        // Restore previous node's color if another node is clicked
        if (lastClickedNode) {
            d3.select(lastClickedNode).style("fill", color(data.targets[data.pcaData.indexOf(lastClickedNode.__data__)]));
        }

        // Store original color and turn this node red
        selection.style("fill", "red");
        lastClickedNode = node; // Update last clicked node
    }
}

// Create the PCA scatter plot
function createPCAscatterPlot(data, container) {
    const width = 800;
    const height = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const tooltip = createTooltip();

    // Set the X-axis and Y-axis labels outside the SVG
    document.getElementById("x-axis-label").textContent = data.xAxisLabel;
    document.getElementById("y-axis-label").textContent = data.yAxisLabel;

    // Clear the existing plot before creating a new one
    d3.select(container).select("svg").remove();  // Remove the existing SVG

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g");

    // Create zoom behavior
    createZoom(svg, g, margin, width, height);

    const x = d3
        .scaleLinear()
        .domain(data.decisionBoundary.xRange)
        .range([margin.left, width - margin.right]);

    const y = d3
        .scaleLinear()
        .domain(data.decisionBoundary.yRange)
        .range([height - margin.bottom, margin.top]);

    // Create color scale
    const uniqueClasses = Array.from(new Set(data.targets));
    const color = d3
        .scaleOrdinal()
        .domain(uniqueClasses)
        .range(d3.schemeCategory10);

    // Draw Voronoi regions
    drawVoronoi(g, data, x, y, color);

    // Create axes
    createAxes(g, x, y, margin, width, height);

    // Create points
    createPoints(g, data, x, y, color, tooltip);
}

// Initialize visualizations
async function initialize(container = "#pca-plot") {
    const data = await fetchData();
    createPCAscatterPlot(data, container);
    return data;
}
