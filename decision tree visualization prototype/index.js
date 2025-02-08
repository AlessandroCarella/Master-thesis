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
        .attr("height", height + margin.top + margin.bottom)
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

    // Add background layer for dragging (transparent rectangle)
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .style("pointer-events", "all"); // Make sure this layer is interactive

    // Add links
    const links = svg
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
    const nodes = svg
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
                switch (d.data.class_label) {
                    case "setosa":
                        return "#4CAF50";
                    case "versicolor":
                        return "#2196F3";
                    case "virginica":
                        return "#9C27B0";
                    default:
                        return "#FFA726";
                }
            }
            return "#FFA726";
        })
        .on("mouseover", function (event, d) {
            // Create tooltip content
            let content = `<strong>Node ID:</strong> ${d.data.node_id}<br>`;

            // Add feature name if present
            if (d.data.feature_name !== null) {
                content += `<strong>Feature:</strong> ${d.data.feature_name}<br>`;
            }

            // Add threshold if present
            if (d.data.threshold !== null) {
                content += `<strong>Threshold:</strong> ${d.data.threshold.toFixed(
                    2
                )}<br>`;
            }

            // Add class label if present
            if (d.data.class_label !== null) {
                content += `<strong>Class:</strong> ${d.data.class_label}<br>`;
            }

            // Always add samples
            content += `<strong>Samples:</strong> ${d.data.samples}`;

            tooltip
                .html(content)
                .style("visibility", "visible")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");

            // Highlight the current node
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
            // Clear previous path color changes
            d3.selectAll(".link").style("stroke", "#ccc"); // Reset all link colors

            // Traverse up to the root and change the color of links
            let currentNode = d;
            if (typeof d.children === 'undefined') { // is leaf
                while (currentNode.parent) {
                    let link = svg
                        .selectAll(".link")
                        .data(treeData.links())
                        .filter(
                            (linkData) =>
                                linkData.source === currentNode.parent &&
                                linkData.target === currentNode
                        );

                    link.style("stroke", "red"); // Change link color to red
                    currentNode = currentNode.parent; // Move up to the parent node
                }

                // Optionally, highlight the clicked leaf node itself
                d3.select(this)
                    .select("circle")
                    .style("stroke", "red")
                    .style("stroke-width", "3px");
            }
        });

    // Zoom functionality
    const zoom = d3.zoom().on("zoom", function (event) {
        svg.attr("transform", event.transform);  // Apply zoom transform to the entire svg

        // Log the zoom transform values
        console.log("--------------------------------")
        console.log("Zoom scale:", event.transform.k);  // Zoom scale (k)
        console.log("Zoom translate X:", event.transform.x);  // Zoom translate X
        console.log("Zoom translate Y:", event.transform.y);  // Zoom translate Y

        // Sync scrollbars with zoom
        const transform = event.transform;
        document.querySelector("#visualization").scrollLeft = transform.x;
        document.querySelector("#visualization").scrollTop = transform.y;
    });

    // Apply zoom behavior to the SVG container
    d3.select("svg").call(zoom);

    // Dragging functionality (without conflicting with zoom)
    let isDragging = false;
    let startX, startY;

    svg.select("rect") // Use the background rect for dragging
        .on("mousedown", function (event) {
            isDragging = true;
            startX = event.pageX;
            startY = event.pageY;
        });

    svg.on("click", function (event) {
        if (isDragging) {
            const dx = event.pageX - startX;
            const dy = event.pageY - startY;

            // Apply dragging offset to the zoom transform
            const transform = d3.zoomTransform(svg.node());
            const newTranslateX = transform.x + dx;
            const newTranslateY = transform.y + dy;

            svg.attr(
                "transform",
                `translate(${newTranslateX},${newTranslateY})`
            );

            // Sync scrollbars with dragging
            document.querySelector("#visualization").scrollLeft = newTranslateX;
            document.querySelector("#visualization").scrollTop = newTranslateY;

            startX = event.pageX;
            startY = event.pageY;
        }
    });

    svg.on("mouseup", function () {
        isDragging = false;
    });
}

// Initialize visualization when the page loads
document.addEventListener("DOMContentLoaded", () => fetchTreeData());
