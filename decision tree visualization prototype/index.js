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
    const SETTINGS = getVisualizationSettings();
    const root = d3.hierarchy(createHierarchy(rawTreeData));
    metrics = calculateMetrics(root, SETTINGS);
    
    clearExistingSVG();
    const svg = createSVGContainer(SETTINGS);
    const contentGroup = createContentGroup(svg, SETTINGS);
    const tooltip = createTooltip();
    
    const treeLayout = createTreeLayout(metrics, SETTINGS, root);
    const treeData = treeLayout(root);
    
    addBackgroundLayer(contentGroup, SETTINGS, metrics);
    addLinks(contentGroup, treeData, metrics, SETTINGS);
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, rawTreeData);
    
    // Calculate initial transform before initializing zoom
    const initialTransform = calculateInitialTransform(treeData, SETTINGS);
    const zoom = initializeZoom(svg, contentGroup, SETTINGS, metrics, initialTransform.k);
    
    // Apply initial transform using the zoom behavior
    svg.call(zoom.transform, initialTransform);
}

////////////////////////////////////////////////////////////////////////
// Function to get visualization settings
function getVisualizationSettings() {
    const margin = { top: 90, right: 90, bottom: 90, left: 90 };
    const width = 1000;
    const height = 1000;
    return {
        margin,
        size: {
            width,
            height,
            innerWidth: width - margin.left - margin.right,
            innerHeight: height - margin.top - margin.bottom,
        },
        tree: {
            splitAngle: -0,
            minSplitWidth: 10,
            minSplitHeight: 10,
            levelHeightScale: 100,
            get radianAngle() {
                return (this.splitAngle * Math.PI) / 180;
            },
        },
        node: {
            // Updated base values and scaling factors
            baseRadius: 12,
            minRadius: 4,
            maxRadius: 20,
            
            baseLinkAndNodeBorderStrokeWidth: 3,
            minLinkAndNodeBorderStrokeWidth: 1,
            maxLinkAndNodeBorderStrokeWidth: 8,
            
            maxZoom: 50,
        },
    };
}

// Function to calculate metrics for the tree layout
function calculateMetrics(root, SETTINGS) {
    const levelCounts = {};
    root.descendants().forEach(node => {
        levelCounts[node.depth] = (levelCounts[node.depth] || 0) + 1;
    });
    const maxNodesAtLevel = Math.max(...Object.values(levelCounts));
    const maxDepth = Math.max(...root.descendants().map((d) => d.depth));
    const totalNodes = root.descendants().length;

    // Helper function to calculate scaled values using a modified logarithmic scale
    function calculateLogScale(totalNodes, baseValue, minValue, maxValue) {
        let scale = Math.sqrt(totalNodes/30)    
        return Math.min(
            maxValue,
            Math.max(
                minValue,
                baseValue * scale
            )
        );
    }

    return {
        totalNodes,
        maxDepth,
        get nodeRadius() {
            return calculateLogScale(
                this.totalNodes,
                SETTINGS.node.baseRadius,
                SETTINGS.node.minRadius,
                SETTINGS.node.maxRadius
            );
        },
        get depthSpacing() {
            return SETTINGS.size.innerHeight / (maxDepth + 1);
        },
        get treeWidth() {
            return this.depthSpacing * (maxDepth + 1);
        },
        get linkStrokeWidth() {
            return calculateLogScale(
                this.totalNodes,
                SETTINGS.node.baseLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.maxLinkAndNodeBorderStrokeWidth
            );
        },
        get nodeBorderStrokeWidth() {
            return calculateLogScale(
                this.totalNodes,
                SETTINGS.node.baseLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.maxLinkAndNodeBorderStrokeWidth
            );
        },
    };
}

// Function to calculate separation between nodes
function calculateSeparation(a, b, metrics, SETTINGS, root) {
    // Separation of nodes
    return SETTINGS.tree.minSplitWidth * 2;
}

// Function to create the tree layout
function createTreeLayout(metrics, SETTINGS, root) {
    // More moderate horizontal spacing
    const horizontalSpacing = root.descendants().length * SETTINGS.tree.minSplitWidth;
    const verticalSpacing = root.descendants().length * SETTINGS.tree.minSplitHeight;
    return d3
        .tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) => calculateSeparation(a, b, metrics, SETTINGS, root));
}

// Function to calculate the radius of a node
function calculateNodeRadius(d, metrics) {
    return metrics.nodeRadius; // Default radius
}

// Function to apply initial transform to center the visualization
function applyZoomToFit(contentGroup, treeData, SETTINGS) {
    // Compute the extents of the tree based on layout coordinates
    const allNodes = treeData.descendants();
    const xExtent = d3.extent(allNodes, d => d.x);
    const yExtent = d3.extent(allNodes, d => d.y);
    
    const treeWidth = xExtent[1] - xExtent[0];
    const treeHeight = yExtent[1] - yExtent[0];
    
    // Compute the scale factors for both directions
    const scaleX = SETTINGS.size.innerWidth / treeWidth;
    const scaleY = SETTINGS.size.innerHeight / treeHeight;
    // Use the smaller scaling to ensure the tree fits in both dimensions
    const k = Math.min(scaleX, scaleY);
    
    // Compute the translation offsets to center the tree in the container
    const translateX = (SETTINGS.size.innerWidth - treeWidth * k) / 2 - xExtent[0] * k + SETTINGS.margin.left;
    const translateY = (SETTINGS.size.innerHeight - treeHeight * k) / 2 - yExtent[0] * k + SETTINGS.margin.top;
    
    contentGroup.attr("transform", `translate(${translateX}, ${translateY}) scale(${k})`);
}

////////////////////////////////////////////////////////////////////////

// Function to initialize zoom functionality
function initializeZoom(svg, contentGroup, SETTINGS, metrics, minZoom) {
    const zoom = d3
        .zoom()
        .scaleExtent([minZoom, SETTINGS.node.maxZoom])
        .on("zoom", function (event) {
            contentGroup.attr("transform", event.transform);
        });

    svg.call(zoom);
    return zoom;
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
        .attr(
            "width",
            SETTINGS.size.innerWidth +
                SETTINGS.margin.left +
                SETTINGS.margin.right
        ) // Set width
        .attr(
            "height",
            SETTINGS.size.innerHeight +
                SETTINGS.margin.top +
                SETTINGS.margin.bottom
        ); // Set height
}

// Function to create a group for content within the SVG
function createContentGroup(svg, SETTINGS) {
    return svg
        .append("g")
        .attr(
            "transform",
            `translate(${SETTINGS.margin.left},${SETTINGS.margin.top})`
        ); // Translate group by margins
}

// Function to create a tooltip for displaying node information
function createTooltip() {
    return d3.select("body").append("div").attr("class", "tooltip"); // Append a div for the tooltip
}

// Function to add a background layer to the visualization
function addBackgroundLayer(contentGroup, SETTINGS, metrics) {
    contentGroup
        .append("rect")
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
        .style("stroke-width", `${metrics.linkStrokeWidth}px`) // Use the new stroke width property
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
    const controlY =
        midY -
        Math.abs(targetX - sourceX) * Math.tan(SETTINGS.tree.radianAngle / 2); // Control point y-coordinate

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`; // Return path string
}

// Function to add nodes to the visualization
function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    rawTreeData
) {
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
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`) // Set stroke width
        .style("stroke", "#ccc") // Set stroke
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics)
        ) // Mouseover event
        .on("mousemove", (event) => handleMouseMove(event, tooltip)) // Mousemove event
        .on("mouseout", function () {
            handleMouseOut(this, tooltip, metrics);
        }) // Mouseout event
        .on("click", (event, d) =>
            handleClick(event, d, contentGroup, treeData, metrics)
        ); // Click event
}

// Function to generate a color map for node classes
function generateClassColorMap(rawTreeData) {
    const predefinedColors = [
        "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3",
        "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd",
        "#ccebc5", "#ffed6f",
    ];
    const classColorMap = {};
    const uniqueClasses = [...new Set(rawTreeData.map((d) => d.class_label))];

    uniqueClasses.forEach((classLabel, index) => {
        classColorMap[classLabel] = index < predefinedColors.length 
            ? predefinedColors[index] 
            : "#" + Math.floor(Math.random() * 16777215).toString(16);
    });

    return classColorMap;
}

// Function to get the color of a node
function getNodeColor(d, classColorMap) {
    return d.data.is_leaf ? (classColorMap[d.data.class_label] || "purple") : "purple";
}

// Function to handle mouseover event on nodes
function handleMouseOver(event, d, tooltip, metrics) {
    let content = `<strong>Node ID:</strong> ${d.data.node_id}<br>`; // Node ID
    if (d.data.class_label !== null) {
        content += `<strong>Class:</strong> ${d.data.class_label}<br>`; // Class label
    }
    if (d.data.feature_name !== null) {
        content += `<strong>Split: </strong>${
            d.data.feature_name
        } > ${d.data.threshold.toFixed(2)}<br>`; // Split feature
    }

    tooltip
        .html(content) // Set tooltip content
        .style("visibility", "visible") // Make tooltip visible
        .style("left", event.pageX + 10 + "px") // Position tooltip
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget)
        .style("stroke", "#000") // Highlight node
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`);
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
        .style("stroke", "#ccc") // Reset node stroke
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`);
}

// Function to handle click event on nodes
function handleClick(event, d, contentGroup, treeData, metrics) {
    event.stopPropagation(); // Stop event propagation
    d3.selectAll(".link").style("stroke", "#ccc"); // Reset link colors

    let currentNode = d;
    if (typeof d.children === "undefined") {
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
                .style(
                    "stroke-width",
                    `${(metrics.linkStrokeWidth * 1.5)}px`                );
            currentNode = currentNode.parent;
        }

        d3.select(event.currentTarget)
            .select("circle")
            .style("stroke", "red") // Highlight clicked node
            .style("stroke-width", `${metrics.nodeBorderStrokeWidth * 1.5}px`);
    }
}

// Function to highlight node by ID
function highlightNodeById() {
    const nodeId = document.getElementById("node-id-input").value;
    const node = d3
        .selectAll(".node")
        .filter((d) => d.data.node_id === parseInt(nodeId));
    const messageElement = document.getElementById("node-message");

    // Remove any existing message
    if (messageElement) {
        messageElement.remove();
    }

    // Get the node data
    const nodeData = node.datum();
    let currentNode = nodeData;

    // Reset all links and nodes
    d3.selectAll(".link")
        .style("stroke", "#ccc")
        .style("stroke-width", `${metrics.linkStrokeWidth}px`);
    d3.selectAll(".node circle")
        .style("stroke", "#ccc")
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`);

    if (node.empty()) {
        console.log(`Node with ID ${nodeId} not found`);
        return;
    }

    // Check if it's a non-leaf node
    if (typeof currentNode.children !== "undefined") {
        // Create and append message element
        const message = document.createElement("span");
        message.id = "node-message";
        message.textContent = "The node selected is not a leaf";
        message.style.marginLeft = "10px";
        message.style.color = "#ff0000";
        document.getElementById("node-search").appendChild(message);
        return;
    }

    // Highlight path to root for leaf nodes
    while (currentNode.parent) {
        d3.selectAll(".link")
            .filter(
                (linkData) =>
                    linkData.source === currentNode.parent &&
                    linkData.target === currentNode
            )
            .style("stroke", "red")
            .style("stroke-width", `${metrics.linkStrokeWidth * 1.5}px`);

        currentNode = currentNode.parent;
    }

    // Highlight the target node
    node.select("circle")
        .style("stroke", "red")
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth * 1.5}px`);
}

// New function to calculate initial transform
function calculateInitialTransform(treeData, SETTINGS) {
    const allNodes = treeData.descendants();
    const xExtent = d3.extent(allNodes, d => d.x);
    const yExtent = d3.extent(allNodes, d => d.y);
    
    const treeWidth = xExtent[1] - xExtent[0];
    const treeHeight = yExtent[1] - yExtent[0];
    
    const scaleX = SETTINGS.size.innerWidth / treeWidth;
    const scaleY = SETTINGS.size.innerHeight / treeHeight;
    const k = Math.min(scaleX, scaleY);
    
    const translateX = (SETTINGS.size.innerWidth - treeWidth * k) / 2 - xExtent[0] * k + SETTINGS.margin.left;
    const translateY = (SETTINGS.size.innerHeight - treeHeight * k) / 2 - yExtent[0] * k + SETTINGS.margin.top;
    
    return d3.zoomIdentity.translate(translateX, translateY).scale(k);
}

// Add this near the top of the file with other function declarations
async function switchTree() {
    try {
        const response = await fetch("http://localhost:8000/switch_tree", {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error("Failed to switch tree");
        }
        // After switching, fetch and display the new tree
        await fetchTreeData();
    } catch (error) {
        console.error("Error switching tree:", error);
    }
}

// Event listener to fetch tree data once the document is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    fetchTreeData();
    // Add event listener for the switch button
    document.getElementById("switch-tree").addEventListener("click", switchTree);
});

