// Fetch data from the FastAPI backend
async function fetchData() {
    const response = await fetch('http://localhost:8000/api/tree-data');
    return await response.json();
}

// Create PCA scatter plot with decision boundaries
function createScatterPlot(data, container) {
    const width = 800;
    const height = 600;
    const margin = { top: 40, right: 100, bottom: 60, left: 60 };
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
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
    const boundaryGroups = svg.append('g')
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
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .ticks(10)
            .tickSize(-height + margin.top + margin.bottom))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('.tick line')
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '2,2'));
    
    svg.append('g')
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
    
    svg.selectAll('path.point')
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
        .style('opacity', 0.8);
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`);
    
    // Class legend
    data.targetNames.forEach((name, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .style('fill', color(i))
            .style('opacity', 0.7);
        
        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(name)
            .style('font-size', '12px');
    });
    
    // Train/Test legend
    const splitLegend = legend.append('g')
        .attr('transform', `translate(0, ${data.targetNames.length * 25 + 20})`);
    
    splitLegend.append('path')
        .attr('d', symbolGenerator.type(d3.symbolCircle))
        .attr('transform', 'translate(7.5, 7.5)')
        .style('fill', '#666');
    
    splitLegend.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text('Training')
        .style('font-size', '12px');
    
    splitLegend.append('path')
        .attr('d', symbolGenerator.type(d3.symbolTriangle))
        .attr('transform', 'translate(7.5, 32.5)')
        .style('fill', '#666');
    
    splitLegend.append('text')
        .attr('x', 20)
        .attr('y', 37)
        .text('Test')
        .style('font-size', '12px');
    
    // Add titles and labels
    svg.append('text')
        .attr('class', 'title')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text('Decision Tree Boundaries in PCA Space');
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - margin.bottom / 3)
        .attr('text-anchor', 'middle')
        .text('Principal Component 1');
    
    svg.append('text')
        .attr('transform', `rotate(-90) translate(${-height/2}, ${margin.left/2})`)
        .attr('text-anchor', 'middle')
        .text('Principal Component 2');
}

// Create decision tree visualization
function createTreeVisualization(data, container) {
    const width = 500;
    const height = 400;
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