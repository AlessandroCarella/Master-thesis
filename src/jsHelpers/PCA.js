export { createPCAscatterPlot };
import { setPCAVisualization } from './visualizationConnector.js';

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
    treeVisualization.contentGroup.selectAll(".link")
        .style("stroke", "#ccc")
        .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);
    
    treeVisualization.contentGroup.selectAll(".node circle")
        .style("stroke", "#ccc")
        .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
    
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
                .filter(linkData => 
                    linkData.source === currentNode.parent && 
                    linkData.target === currentNode
                )
                .style("stroke", "red")
                .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);
            
            // Highlight the node
            treeVisualization.contentGroup
                .selectAll(".node")
                .filter(d => d === currentNode)
                .select("circle")
                .style("stroke", "red")
                .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
            
            currentNode = currentNode.parent;
        }
    }
}

// Create points with event handlers
function createPoints(g, data, x, y, color, tooltip, treeVisualization) {
    console.log('Creating points with tree visualization:', !!treeVisualization);
    
    const symbolGenerator = d3.symbol().size(100);
    let lastClickedPoint = null;

    const points = g.selectAll("path.point")
        .data(data.pcaData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", d => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", symbolGenerator.type(d3.symbolCircle))
        .style("fill", (d, i) => color(data.targets[i]))
        .style("stroke", "#fff")
        .style("stroke-width", 1)
        .style("opacity", 0.8)
        .on("mouseover", (event, d) => showTooltip(event, d, data, tooltip))
        .on("mouseout", () => hideTooltip(tooltip))
        .on("click", function(event, d) {
            console.log('Point clicked:', d);
            togglePointColor(this, d, data, color, treeVisualization);
        });

    return points;
}

// Show tooltip on hover with original data
function showTooltip(event, d, data, tooltip) {
    // Get the index of the point in pcaData
    const pointIndex = event.target.__data__ ? data.pcaData.findIndex(p => 
        p[0] === event.target.__data__[0] && p[1] === event.target.__data__[1]
    ) : -1;

    if (pointIndex === -1) {
        console.warn('Could not find matching point data');
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
    
    treeVisualization.contentGroup.selectAll(".link")
        .style("stroke", "#ccc")
        .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);
    
    treeVisualization.contentGroup.selectAll(".node circle")
        .style("stroke", "#ccc")
        .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
}

function highlightTreePath(path, treeVisualization) {
    // Reset previous highlights
    resetTreeHighlights(treeVisualization);

    // Highlight the path
    for (let i = 0; i < path.length - 1; i++) {
        treeVisualization.contentGroup
            .selectAll(".link")
            .filter(linkData => 
                linkData.source === path[i] && 
                linkData.target === path[i + 1]
            )
            .style("stroke", "red")
            .style("stroke-width", `${treeVisualization.metrics.linkStrokeWidth}px`);
    }

    // Highlight the leaf node
    if (path.length > 0) {
        treeVisualization.contentGroup
            .selectAll(".node")
            .filter(d => d === path[path.length - 1])
            .select("circle")
            .style("stroke", "red")
            .style("stroke-width", `${treeVisualization.metrics.nodeBorderStrokeWidth}px`);
    }
}

let lastClickedNode = null; // Declare globally
// Toggle point color on click
function togglePointColor(node, d, data, color, treeVisualization) {
    console.log('togglePointColor called with:', {
        node,
        point: d,
        hasTreeVis: !!treeVisualization,
        treeData: treeVisualization?.treeData ? 'exists' : 'missing'
    });

    const index = data.pcaData.indexOf(d);
    const originalFeatures = data.originalData[index];
    
    console.log('Original features for clicked point:', originalFeatures);
    
    // Reset previous highlights
    if (lastClickedNode) {
        console.log('Resetting previous highlighted point');
        d3.select(lastClickedNode).style("fill", color(
            data.targets[data.pcaData.indexOf(lastClickedNode.__data__)]
        ));
    }

    // If clicking the same point, reset everything
    if (lastClickedNode === node) {
        console.log('Clicked same point, resetting visualization');
        lastClickedNode = null;
        if (treeVisualization) {
            resetTreeHighlights(treeVisualization);
        }
        return;
    }

    // Highlight new point
    console.log('Highlighting new point');
    lastClickedNode = node;
    d3.select(node).style("fill", "red");

    // Find and highlight tree path
    if (treeVisualization && treeVisualization.treeData) {
        console.log('Finding path through tree');
        let currentNode = treeVisualization.treeData;
        const path = [];

        // Find the path through the tree
        while (currentNode && !currentNode.data.is_leaf) {
            console.log('Traversing node:', {
                feature: currentNode.data.feature_name,
                threshold: currentNode.data.threshold,
                featureValue: originalFeatures[currentNode.data.feature_name]
            });
            
            path.push(currentNode);
            const featureValue = originalFeatures[currentNode.data.feature_name];
            currentNode = featureValue <= currentNode.data.threshold ? 
                currentNode.children[0] : currentNode.children[1];
        }
        if (currentNode) {
            console.log('Found leaf node:', currentNode.data);
            path.push(currentNode);
        }

        // Highlight the path
        console.log('Highlighting path with length:', path.length);
        highlightTreePath(path, treeVisualization);
    } else {
        console.log('Tree visualization not available:', {
            treeVis: !!treeVisualization,
            treeData: treeVisualization?.treeData
        });
    }
}

// Create the PCA scatter plot
function createPCAscatterPlot(data, container, treeVis) {
    // Validate input data
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

    console.log('Creating PCA scatter plot with tree visualization:', treeVis);
    const treeVisualization = treeVis || window.treeVisualization; // Try both sources
    console.log('Final tree visualization reference:', treeVisualization);

    const visualization = { data, points: null };
    setPCAVisualization(visualization);

    const width = 800;
    const height = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const tooltip = createTooltip();

    // Set the X-axis and Y-axis labels outside the SVG
    document.getElementById("x-axis-label").textContent = data.xAxisLabel;
    document.getElementById("y-axis-label").textContent = data.yAxisLabel;

    // Clear the existing plot before creating a new one
    d3.select(container).select("svg").remove(); // Remove the existing SVG

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
    visualization.points = createPoints(g, data, x, y, color, tooltip, treeVisualization);

    return visualization;
}
