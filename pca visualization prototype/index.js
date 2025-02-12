// Fetch data from the FastAPI backend
async function fetchData() {
    const response = await fetch('http://localhost:8000/tree-data');
    return await response.json();
}

// Create PCA scatter plot with decision boundaries
function createScatterPlot(data, container) {
    const width = 1000;
    const height = 1000;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    
    // Create tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none");
    
    // Set the X-axis and Y-axis labels outside the SVG
    document.getElementById("x-axis-label").textContent = data.xAxisLabel;
    document.getElementById("y-axis-label").textContent = data.yAxisLabel;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create a group for zoom transformation
    const g = svg.append('g');
    
    // Add zoom behavior with initial scale
    const initialZoom = d3.zoomIdentity;
    const zoom = d3.zoom()
        .scaleExtent([initialZoom.k, 5]) // Min zoom set to initial zoom level
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    const x = d3.scaleLinear()
        .domain(data.decisionBoundary.xRange)
        .range([margin.left, width - margin.right]);
    
    const y = d3.scaleLinear()
        .domain(data.decisionBoundary.yRange)
        .range([height - margin.bottom, margin.top]);
    
    // Create dynamic color scale based on unique classes
    const uniqueClasses = Array.from(new Set(data.targets));
    const color = d3.scaleOrdinal()
        .domain(uniqueClasses)
        .range(d3.schemeCategory10); // Uses D3's built-in categorical color scheme
    
    // Draw decision boundary as filled Voronoi regions
    const voronoiGroup = g.append('g')
        .attr('class', 'voronoi-regions');

    data.decisionBoundary.regions.forEach((polygon, i) => {
        voronoiGroup.append('polygon')
            .attr('points', polygon.map(d => `${x(d[0])},${y(d[1])}`).join(" "))
            .attr('fill', color(data.decisionBoundary.regionClasses[i]))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.3);
        }
    );

    // Add axes with grid lines
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .ticks(10)
            .tickSize(-height + margin.top + margin.bottom))
        .call(g => g.select('.domain').remove())
    
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y)
            .ticks(10)
            .tickSize(-width + margin.left + margin.right))
        .call(g => g.select('.domain').remove())
    
    // Add points with different symbols for train/test
    const symbolGenerator = d3.symbol().size(100);

    let lastClickedNode = null;
    const points = g.selectAll('path.point')
        .data(data.pcaData)
        .enter()
        .append('path')
        .attr('class', 'point')
        .attr('transform', d => `translate(${x(d[0])},${y(d[1])})`)
        .attr('d', symbolGenerator.type(d3.symbolCircle))
        .style('fill', (d, i) => color(data.targets[i]))
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('opacity', 0.8)
        // Add hover interaction
        .on('mouseover', (event, d, i) => {
            const index = data.pcaData.indexOf(d);
            const className = data.targetNames[data.targets[index]];
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            tooltip.html(`Class: ${className}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .on('click', function(event, d) {
            // Reset the color of the previously clicked node
            if (lastClickedNode && lastClickedNode !== this) {
                d3.select(lastClickedNode)
                    .style('fill', (d, i) => color(data.targets[data.pcaData.indexOf(d)]));
            }
        
            const node = d3.select(this);
            const currentColor = node.style('fill');
        
            // Toggle color: if red, revert to original, otherwise change to red
            if (currentColor === "red") {
                node.style('fill', (d, i) => color(data.targets[data.pcaData.indexOf(d)]));
                lastClickedNode = null;
            } else {
                node.style('fill', "red");
                lastClickedNode = this;
            }
        });
}

// Initialize visualizations
async function initialize() {
    const data = await fetchData();
    createScatterPlot(data, '#pca-plot');
}

initialize();