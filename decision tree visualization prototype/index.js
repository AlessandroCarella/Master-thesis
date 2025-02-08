async function fetchTreeData() {
    try {
        const response = await fetch("http://localhost:8000/tree_data");
        if (!response.ok) {
            throw new Error("Failed to fetch tree data");
        }
        const data = await response.json();
        createVisualization(data);
    } catch (error) {
        console.error("Error fetching tree data:", error);
    }
}

function createHierarchy(data) {
    const nodesById = {};
    data.forEach((node) => {
        nodesById[node.node_id] = { ...node, children: [] };
    });

    const root = nodesById[0];
    data.forEach((node) => {
        if (node.left_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.left_child]);
        }
        if (node.right_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.right_child]);
        }
    });

    return root;
}

function createVisualization(rawTreeData) {
    const margin = { top: 90, right: 30, bottom: 90, left: 90 };
    const width = 1100 - margin.left - margin.right;
    const height = 1100 - margin.top - margin.bottom;

    // Clear any existing SVG
    d3.select("#visualization svg").remove();

    // Create SVG container
    const svg = d3
        .select("#visualization")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    // Create a group for all content that will be transformed
    const contentGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip div
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // Create tree layout
    const treeLayout = d3.tree().size([width, height]);

    // Convert the data to hierarchy
    const root = d3.hierarchy(createHierarchy(rawTreeData));

    // Generate tree layout
    const treeData = treeLayout(root);

    // Add background layer for dragging
    contentGroup.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .style("pointer-events", "all");

    // Add links
    const links = contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr(
            "d",
            d3
                .linkVertical()
                .x((d) => d.x)
                .y((d) => d.y)
        );

    // Create nodes
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add circles to nodes
    nodes
        .append("circle")
        .attr("r", 10)
        .style("fill", (d) => {
            if (d.data.is_leaf) {
                return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
            }
            return "#FFA726";
        })        
        .on("mouseover", function (event, d) {
            let content = `<strong>Node ID:</strong> ${d.data.node_id}<br>`;
            if (d.data.feature_name !== null) {
                content += `<strong>Feature:</strong> ${d.data.feature_name}<br>`;
            }
            if (d.data.threshold !== null) {
                content += `<strong>Threshold:</strong> ${d.data.threshold.toFixed(2)}<br>`;
            }
            if (d.data.class_label !== null) {
                content += `<strong>Class:</strong> ${d.data.class_label}<br>`;
            }
            content += `<strong>Samples:</strong> ${d.data.samples}`;

            tooltip
                .html(content)
                .style("visibility", "visible")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");

            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "3px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this)
                .style("stroke", "#fff")
                .style("stroke-width", "2px");
        })
        .on("click", function (event, d) {
            event.stopPropagation();

            d3.selectAll(".link").style("stroke", "#ccc");

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

                    link.style("stroke", "red");
                    currentNode = currentNode.parent;
                }

                d3.select(this)
                    .select("circle")
                    .style("stroke", "red")
                    .style("stroke-width", "3px");
            }
        });

    // Initialize zoom behavior
    const maxZoom = 100;
    let currentTransform = d3.zoomIdentity;

    const zoom = d3.zoom()
        .scaleExtent([0.5, maxZoom])
        .on("zoom", function(event) {
            currentTransform = event.transform;
            contentGroup.attr("transform", `translate(${event.transform.x + margin.left},${event.transform.y + margin.top}) scale(${event.transform.k})`);
        });

    // Apply zoom behavior to the SVG
    svg.call(zoom);

    // Drag handling
    let isDragging = false;
    let dragStartX, dragStartY;

    svg.on("mousedown", function(event) {
        if (event.target.tagName === "circle") return; // Don't initiate drag on nodes
        isDragging = true;
        dragStartX = event.clientX - currentTransform.x;
        dragStartY = event.clientY - currentTransform.y;
    });

    svg.on("mousemove", function(event) {
        if (!isDragging) return;
        
        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        
        // Update the transform
        currentTransform.x = dx;
        currentTransform.y = dy;
        
        // Apply the new transform
        contentGroup.attr("transform", 
            `translate(${dx + margin.left},${dy + margin.top}) scale(${currentTransform.k})`
        );
    });

    svg.on("mouseup", function() {
        isDragging = false;
    });

    svg.on("mouseleave", function() {
        isDragging = false;
    });
}

// Initialize visualization when the page loads
document.addEventListener("DOMContentLoaded", () => fetchTreeData());