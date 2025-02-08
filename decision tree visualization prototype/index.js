// Function to fetch tree data from the server
async function fetchTreeData() {
    try {
        // Fetch data from the specified URL
        const response = await fetch("http://localhost:8000/tree_data");
        // Check if the response is not OK, throw an error
        if (!response.ok) {
            throw new Error("Failed to fetch tree data");
        }
        // Parse the response as JSON
        const data = await response.json();
        // Create visualization with the fetched data
        createVisualization(data);
    } catch (error) {
        // Log any errors that occur during the fetch
        console.error("Error fetching tree data:", error);
    }
}

// Function to create a hierarchy from the flat data
function createHierarchy(data) {
    const nodesById = {};
    // Create a map of nodes by their ID
    data.forEach((node) => {
        nodesById[node.node_id] = { ...node, children: [] };
    });

    // Assume the root node has ID 0
    const root = nodesById[0];
    // Assign children to each node based on left and right child IDs
    data.forEach((node) => {
        if (node.left_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.left_child]);
        }
        if (node.right_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.right_child]);
        }
    });

    return root; // Return the root of the hierarchy
}

// Function to create the visualization using D3.js
function createVisualization(rawTreeData) {
    const SETTINGS = getVisualizationSettings(); // Get visualization settings
    const root = d3.hierarchy(createHierarchy(rawTreeData)); // Create a D3 hierarchy
    metrics = calculateMetrics(root, SETTINGS); // Calculate metrics for layout and store globally

    clearExistingSVG(); // Clear any existing SVG elements
    const svg = createSVGContainer(SETTINGS); // Create the SVG container
    const contentGroup = createContentGroup(svg, SETTINGS); // Create a group for content
    const tooltip = createTooltip(); // Create a tooltip for node information

    const treeLayout = createTreeLayout(metrics, SETTINGS, root); // Create the tree layout
    const treeData = treeLayout(root); // Apply the layout to the root

    addBackgroundLayer(contentGroup, SETTINGS, metrics); // Add a background layer
    addLinks(contentGroup, treeData, metrics, SETTINGS); // Add links between nodes
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, rawTreeData); // Add nodes

    applyInitialTransform(contentGroup, metrics, SETTINGS); // Apply initial transform for centering
    initializeZoom(svg, contentGroup, SETTINGS, metrics); // Initialize zoom functionality
    handleDragging(svg, contentGroup, SETTINGS, metrics); // Handle dragging of the visualization
}

// Function to get visualization settings
function getVisualizationSettings() {
    const margin = { top: 90, right: 90, bottom: 90, left: 90 }; // Define margins
    const width = 1000; // Define width
    const height = 1000; // Define height
    return {
        margin,
        size: {
            width,
            height,
            innerWidth: width - margin.left - margin.right, // Calculate inner width
            innerHeight: height - margin.top - margin.bottom // Calculate inner height
        },
        tree: {
            splitAngle: -0, // Angle for tree split
            minSplitWidth: 1000, // Minimum width for split
            levelHeightScale: 100, // Scale for level height
            get radianAngle() { return (this.splitAngle * Math.PI) / 180 } // Convert angle to radians
        },
        node: {
            baseRadius: 5, // Base radius for nodes
            minRadius: 2, // Minimum radius for nodes
            maxZoom: 100 // Maximum zoom level
        }
    };
}

// Function to calculate metrics for the tree layout
function calculateMetrics(root, SETTINGS) {
    return {
        totalNodes: root.descendants().length, // Total number of nodes
        maxDepth: Math.max(...root.descendants().map(d => d.depth)), // Maximum depth of the tree
        get scaleFactor() { return Math.max(0.3, 1 - (this.totalNodes / 1000)) }, // Scale factor for nodes
        get nodeRadius() { return Math.max(SETTINGS.node.minRadius, SETTINGS.node.baseRadius * this.scaleFactor) }, // Node radius
        get depthSpacing() { return (SETTINGS.size.innerHeight * SETTINGS.tree.levelHeightScale) / (this.maxDepth + 1) }, // Spacing between levels
        get treeWidth() {
            const levelWidth = 100 * this.depthSpacing * Math.tan(SETTINGS.tree.radianAngle); // Width of each level
            return Math.max(SETTINGS.size.innerWidth, levelWidth * (this.maxDepth + 1)); // Total tree width
        }
    };
}

// Function to clear existing SVG elements
function clearExistingSVG() {
    d3.select("#visualization svg").remove(); // Remove existing SVG
}

// Function to create the SVG container
function createSVGContainer(SETTINGS) {
    return d3
        .select("#visualization")
        .append("svg")
        .attr("width", SETTINGS.size.innerWidth + SETTINGS.margin.left + SETTINGS.margin.right) // Set width
        .attr("height", SETTINGS.size.innerHeight + SETTINGS.margin.top + SETTINGS.margin.bottom); // Set height
}

// Function to create a group for content within the SVG
function createContentGroup(svg, SETTINGS) {
    return svg
        .append("g")
        .attr("transform", `translate(${SETTINGS.margin.left},${SETTINGS.margin.top})`); // Translate group by margins
}

// Function to create a tooltip for displaying node information
function createTooltip() {
    return d3.select("body").append("div").attr("class", "tooltip"); // Append a div for the tooltip
}

// Function to create the tree layout
function createTreeLayout(metrics, SETTINGS, root) {
    return d3.tree()
        .size([metrics.treeWidth * 3, SETTINGS.size.innerHeight * 3]) // Set size of the layout
        .separation((a, b) => calculateSeparation(a, b, metrics, SETTINGS, root)); // Define separation between nodes
}

// Function to calculate separation between nodes
function calculateSeparation(a, b, metrics, SETTINGS, root) {
    const depthFactor = Math.pow(0.7, Math.min(a.depth, b.depth)); // Factor based on depth
    const baseSeparation = SETTINGS.tree.minSplitWidth / metrics.treeWidth; // Base separation
    const depthMultiplier = Math.max(1, (metrics.maxDepth - a.depth) * 2); // Multiplier based on depth
    const separationMultiplier = a.parent === b.parent ? depthMultiplier : depthMultiplier * 1.5; // Adjust multiplier if nodes share a parent
    const aLeaves = a.leaves().length; // Number of leaves for node a
    const bLeaves = b.leaves().length; // Number of leaves for node b
    const leafFactor = Math.max(aLeaves, bLeaves) / root.leaves().length; // Factor based on leaves
    const isLeafParent = a.children?.[0]?.data.is_leaf || b.children?.[0]?.data.is_leaf; // Check if node is a leaf parent
    const leafParentBonus = isLeafParent ? 1.2 : 1; // Bonus for leaf parents

    return Math.max(
        baseSeparation * separationMultiplier * leafParentBonus, // Calculate separation
        (leafFactor + depthFactor) * baseSeparation * 1.5
    );
}

// Function to add a background layer to the visualization
function addBackgroundLayer(contentGroup, SETTINGS, metrics) {
    contentGroup.append("rect")
        .attr("width", Math.max(SETTINGS.size.innerWidth, metrics.treeWidth)) // Set width
        .attr("height", SETTINGS.size.innerHeight * 3) // Set height
        .style("fill", "transparent") // Set fill to transparent
        .style("pointer-events", "all"); // Allow pointer events
}

// Function to add links between nodes
function addLinks(contentGroup, treeData, metrics, SETTINGS) {
    contentGroup
        .selectAll(".link")
        .data(treeData.links()) // Bind data for links
        .enter()
        .append("path")
        .attr("class", "link")
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`) // Set stroke width
        .attr("d", (d) => createSplitPath(d, SETTINGS)) // Define path
        .style("fill", "none") // No fill
        .style("stroke", "#ccc"); // Set stroke color
}

// Function to create a path for links
function createSplitPath(d, SETTINGS) {
    const sourceX = d.source.x; // Source x-coordinate
    const sourceY = d.source.y; // Source y-coordinate
    const targetX = d.target.x; // Target x-coordinate
    const targetY = d.target.y; // Target y-coordinate
    const midY = (sourceY + targetY) / 2; // Midpoint y-coordinate
    const controlX = sourceX + (targetX - sourceX) / 2; // Control point x-coordinate
    const controlY = midY - Math.abs(targetX - sourceX) * Math.tan(SETTINGS.tree.radianAngle / 2); // Control point y-coordinate

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`; // Return path string
}

// Function to add nodes to the visualization
function addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, rawTreeData) {
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants()) // Bind data for nodes
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`); // Position nodes

    const classColorMap = generateClassColorMap(rawTreeData); // Generate color map for classes

    nodes
        .append("circle")
        .attr("r", (d) => calculateNodeRadius(d, metrics)) // Set radius
        .style("fill", (d) => getNodeColor(d, classColorMap)) // Set fill color
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`) // Set stroke width
        .on("mouseover", (event, d) => handleMouseOver(event, d, tooltip, metrics)) // Mouseover event
        .on("mousemove", (event) => handleMouseMove(event, tooltip)) // Mousemove event
        .on("mouseout", function () { handleMouseOut(this, tooltip, metrics); }) // Mouseout event
        .on("click", (event, d) => handleClick(event, d, contentGroup, treeData, metrics)); // Click event
}

// Function to generate a color map for node classes
function generateClassColorMap(rawTreeData) {
    const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Generate random color
    const classColorMap = {};
    const uniqueClasses = [...new Set(rawTreeData.map(d => d.class_label))]; // Get unique class labels

    uniqueClasses.forEach(classLabel => {
        classColorMap[classLabel] = getRandomColor(); // Assign random color to each class
    });

    return classColorMap; // Return the color map
}

// Function to calculate the radius of a node
function calculateNodeRadius(d, metrics) {
    if (d.depth === 0) return metrics.nodeRadius * 1.5; // Larger radius for root
    if (d.data.is_leaf) return metrics.nodeRadius * 1.2; // Slightly larger for leaf nodes
    return metrics.nodeRadius; // Default radius
}

// Function to get the color of a node
function getNodeColor(d, classColorMap) {
    if (d.data.is_leaf) {
        return classColorMap[d.data.class_label] || getRandomColor(); // Use class color or random
    }
    return "#FFA726"; // Default color for non-leaf nodes
}

// Function to handle mouseover event on nodes
function handleMouseOver(event, d, tooltip, metrics) {
    let content = `<strong>Node ID:</strong> ${d.data.node_id}<br>`; // Node ID
    if (d.data.class_label !== null) {
        content += `<strong>Class:</strong> ${d.data.class_label}<br>`; // Class label
    }
    if (d.data.feature_name !== null) {
        content += `<strong>Split:</strong>${d.data.feature_name} > ${d.data.threshold.toFixed(2)}<br>`; // Split feature
    }

    tooltip
        .html(content) // Set tooltip content
        .style("visibility", "visible") // Make tooltip visible
        .style("left", event.pageX + 10 + "px") // Position tooltip
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget)
        .style("stroke", "#000") // Highlight node
        .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
}

// Function to handle mousemove event for tooltip
function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px") // Update tooltip position
        .style("top", event.pageY - 10 + "px");
}

// Function to handle mouseout event on nodes
function handleMouseOut(node, tooltip, metrics) {
    tooltip.style("visibility", "hidden"); // Hide tooltip
    d3.select(node)
        .style("stroke", "#fff") // Reset node stroke
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`);
}

// Function to handle click event on nodes
function handleClick(event, d, contentGroup, treeData, metrics) {
    event.stopPropagation(); // Stop event propagation
    d3.selectAll(".link").style("stroke", "#ccc"); // Reset link colors

    let currentNode = d;
    if (typeof d.children === 'undefined') {
        while (currentNode.parent) {
            let link = contentGroup
                .selectAll(".link")
                .data(treeData.links())
                .filter(
                    (linkData) =>
                        linkData.source === currentNode.parent &&
                        linkData.target === currentNode
                );

            link.style("stroke", "red") // Highlight path to root
                .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
            currentNode = currentNode.parent;
        }

        d3.select(event.currentTarget)
            .select("circle")
            .style("stroke", "red") // Highlight clicked node
            .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
    }
}

// Function to apply initial transform to center the visualization
function applyInitialTransform(contentGroup, metrics, SETTINGS) {
    const initialTransform = {
        x: (SETTINGS.size.innerWidth - metrics.treeWidth) / 2, // Center horizontally
        y: 0,
        k: Math.min(1, SETTINGS.size.innerWidth / metrics.treeWidth) // Scale to fit
    };

    contentGroup.attr("transform", 
        `translate(${initialTransform.x + SETTINGS.margin.left},${SETTINGS.margin.top}) scale(${initialTransform.k})`
    );
}

// Function to initialize zoom functionality
function initializeZoom(svg, contentGroup, SETTINGS, metrics) {
    let currentTransform = d3.zoomIdentity
        .translate((SETTINGS.size.innerWidth - metrics.treeWidth) / 2, 0)
        .scale(Math.min(1, SETTINGS.size.innerWidth / metrics.treeWidth));

    const zoom = d3.zoom()
        .scaleExtent([0.1, SETTINGS.node.maxZoom]) // Set zoom limits
        .on("zoom", function(event) {
            currentTransform = event.transform;
            contentGroup.attr("transform", 
                `translate(${event.transform.x + SETTINGS.margin.left},${event.transform.y + SETTINGS.margin.top}) scale(${event.transform.k})`
            );
        });

    svg.call(zoom); // Apply zoom to SVG
}

// Function to handle dragging of the visualization
function handleDragging(svg, contentGroup, SETTINGS, metrics) {
    let isDragging = false;
    let dragStartX, dragStartY;

    svg.on("mousedown", function(event) {
        if (event.target.tagName === "circle") return; // Ignore if clicking on a node
        isDragging = true;
        dragStartX = event.clientX - currentTransform.x; // Record start position
        dragStartY = event.clientY - currentTransform.y;
    });

    svg.on("mousemove", function(event) {
        if (!isDragging) return;
        
        const dx = event.clientX - dragStartX; // Calculate drag distance
        const dy = event.clientY - dragStartY;
        
        currentTransform.x = dx;
        currentTransform.y = dy;
        
        contentGroup.attr("transform", 
            `translate(${dx + SETTINGS.margin.left},${dy + SETTINGS.margin.top}) scale(${currentTransform.k})`
        );
    });

    svg.on("mouseup", function() {
        isDragging = false; // Stop dragging
    });

    svg.on("mouseleave", function() {
        isDragging = false; // Stop dragging if mouse leaves SVG
    });
}

// Function to highlight node by ID
function highlightNodeById() {
    const nodeId = document.getElementById('node-id-input').value;
    const node = d3.selectAll('.node').filter(d => d.data.node_id === parseInt(nodeId));
    
    if (node.empty()) {
        console.log(`Node with ID ${nodeId} not found`);
        return;
    }

    // Reset all links and nodes
    d3.selectAll(".link").style("stroke", "#ccc")
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`);
    d3.selectAll(".node circle")
        .style("stroke", "#fff")
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`);

    // Get the node data
    const nodeData = node.datum();
    let currentNode = nodeData;

    // Highlight path to root
    while (currentNode.parent) {
        d3.selectAll(".link")
            .filter(linkData => 
                linkData.source === currentNode.parent && 
                linkData.target === currentNode
            )
            .style("stroke", "red")
            .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
        
        currentNode = currentNode.parent;
    }

    // Highlight the target node
    node.select("circle")
        .style("stroke", "red")
        .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
}

// Event listener to fetch tree data once the document is fully loaded
document.addEventListener("DOMContentLoaded", () => fetchTreeData());