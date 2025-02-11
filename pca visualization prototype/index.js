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
    
    // Create color scales
    const color = d3.scaleOrdinal()
        .domain(d3.range(3))
        .range(['#ff7f0e', '#1f77b4', '#2ca02c']);
    
    const probabilityColor = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateViridis);
    
    // Draw decision boundaries with improved visualization
    const cellWidth = Math.ceil((width - margin.left - margin.right) / 
        ((data.decisionBoundary.xRange[1] - data.decisionBoundary.xRange[0]) / data.decisionBoundary.step));
    const cellHeight = Math.ceil((height - margin.top - margin.bottom) / 
        ((data.decisionBoundary.yRange[1] - data.decisionBoundary.yRange[0]) / data.decisionBoundary.step));
    
    // Create groups for each class
    const boundaryGroups = g.append('g')
        .attr('class', 'boundaries');
    
    // Draw decision boundaries with opacity based on probability
    data.decisionBoundary.points.forEach(point => {
        boundaryGroups.append('rect')
            .attr('x', x(point.x) - cellWidth/2)
            .attr('y', y(point.y) - cellHeight/2)
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .style('fill', color(point.class))
            .style('opacity', point.probabilities[point.class] * 0.3);
    });
    
    // Add axes with grid lines
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .ticks(10)
            .tickSize(-height + margin.top + margin.bottom))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line')
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '2,2'));
    
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y)
            .ticks(10)
            .tickSize(-width + margin.left + margin.right))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line')
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '2,2'));
    
    // Add points with different symbols for train/test
    const symbolGenerator = d3.symbol().size(100);

    let lastClickedNode = null;
    const points = g.selectAll('path.point')
        .data(data.pcaData)
        .enter()
        .append('path')
        .attr('class', 'point')
        .attr('transform', d => `translate(${x(d[0])},${y(d[1])})`)
        .attr('d', symbolGenerator.type((d, i) => 
            data.trainIndices.includes(data.targets[i]) ? d3.symbolCircle : d3.symbolTriangle))
        .style('fill', (d, i) => color(data.targets[i]))
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('opacity', 0.8)
        // Add hover interaction
        .on('mouseover', (event, d, i) => {
            const index = data.pcaData.indexOf(d);
            const pointType = data.trainIndices.includes(data.targets[index]) ? 'Training' : 'Test';
            const className = data.targetNames[data.targets[index]];
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            tooltip.html(`Class: ${className}<br/>Type: ${pointType}`)
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

// Create decision tree visualization
function createTreeVisualization(data, container) {
    const width = 1000;
    const height = 1000;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create hierarchical structure
    const root = d3.stratify()
        .id(d => d.id)
        .parentId(d => {
            if (d.id === 0) return null;
            for (const node of data.treeData) {
                if (node.left === d.id || node.right === d.id) return node.id;
            }
        })
        (data.treeData);
    
    const treeLayout = d3.tree()
        .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
    
    const nodes = root.descendants();
    const links = root.links();
    
    treeLayout(root);
    
    // Create links
    g.selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y));
    
    // Create nodes
    const node = g.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 5);
    
    // Add labels to nodes
    node.append('text')
        .attr('dy', '0.31em')
        .attr('x', d => d.children ? -6 : 6)
        .style('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => {
            const nodeData = data.treeData[d.id];
            if (nodeData.feature === 'leaf') {
                const values = nodeData.value[0];
                const maxIndex = values.indexOf(Math.max(...values));
                return data.targetNames[maxIndex];
            }
            return `${nodeData.feature}\n< ${nodeData.threshold.toFixed(2)}`;
        });
}

// Initialize visualizations
async function initialize() {
    const data = await fetchData();
    createScatterPlot(data, '#pca-plot');
    createTreeVisualization(data, '#tree-visualization');
}

initialize();