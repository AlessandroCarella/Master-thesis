// Fetch data from the FastAPI backend
async function fetchData() {
    const response = await fetch('http://localhost:8000/api/tree-data');
    return await response.json();
}

// Create PCA scatter plot with decision boundaries
function createScatterPlot(data, container) {
    const width = 600;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    
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
    
    // Create color scale
    const color = d3.scaleOrdinal()
        .domain(d3.range(3))
        .range(['#ff7f0e', '#1f77b4', '#2ca02c']);
    
    // Draw decision boundaries
    const cellWidth = (width - margin.left - margin.right) / 
        ((data.decisionBoundary.xRange[1] - data.decisionBoundary.xRange[0]) / data.decisionBoundary.step);
    const cellHeight = (height - margin.top - margin.bottom) / 
        ((data.decisionBoundary.yRange[1] - data.decisionBoundary.yRange[0]) / data.decisionBoundary.step);
    
    svg.selectAll('rect.boundary')
        .data(data.decisionBoundary.points)
        .enter()
        .append('rect')
        .attr('class', 'boundary')
        .attr('x', d => x(d.x) - cellWidth/2)
        .attr('y', d => y(d.y) - cellHeight/2)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .style('fill', d => color(d.class))
        .style('opacity', 0.2);
    
    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .append('text')
        .attr('x', width - margin.right)
        .attr('y', -10)
        .text('PC1');
    
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 15)
        .text('PC2');
    
    // Add points
    svg.selectAll('circle.point')
        .data(data.pcaData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 4)
        .style('fill', (d, i) => color(data.targets[i]))
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('opacity', 0.8);
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right - 100},${margin.top})`);
    
    data.targetNames.forEach((name, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
        
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