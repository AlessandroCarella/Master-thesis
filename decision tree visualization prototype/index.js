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
    // Core visualization settings
    const SETTINGS = {
        margin: { top: 90, right: 90, bottom: 90, left: 90 },
        size: {
            width: 1000,
            height: 1000,
            get innerWidth() { return this.width - SETTINGS.margin.left - SETTINGS.margin.right },
            get innerHeight() { return this.height - SETTINGS.margin.top - SETTINGS.margin.bottom }
        },
        tree: {
            splitAngle: -0,
            minSplitWidth: 1000,
            levelHeightScale: 100,
            get radianAngle() { return (this.splitAngle * Math.PI) / 180 }
        },
        node: {
            baseRadius: 5,
            minRadius: 2,
            maxZoom: 100
        }
    };

    // Convert the data to hierarchy and calculate core metrics
    const root = d3.hierarchy(createHierarchy(rawTreeData));
    const metrics = {
        totalNodes: root.descendants().length,
        maxDepth: Math.max(...root.descendants().map(d => d.depth)),
        get scaleFactor() { return Math.max(0.3, 1 - (this.totalNodes / 1000)) },
        get nodeRadius() { return Math.max(SETTINGS.node.minRadius, SETTINGS.node.baseRadius * this.scaleFactor) },
        get depthSpacing() { return (SETTINGS.size.innerHeight * SETTINGS.tree.levelHeightScale) / (this.maxDepth + 1) },
        get treeWidth() {
            const levelWidth = 100 * this.depthSpacing * Math.tan(SETTINGS.tree.radianAngle);
            return Math.max(SETTINGS.size.innerWidth, levelWidth * (this.maxDepth + 1));
        }
    };

    // Clear any existing SVG
    d3.select("#visualization svg").remove();

    // Create SVG container
    const svg = d3
        .select("#visualization")
        .append("svg")
        .attr("width", SETTINGS.size.innerWidth + SETTINGS.margin.left + SETTINGS.margin.right)
        .attr("height", SETTINGS.size.innerHeight + SETTINGS.margin.top + SETTINGS.margin.bottom);
    
    // Create a group for all content that will be transformed
    const contentGroup = svg
        .append("g")
        .attr("transform", `translate(${SETTINGS.margin.left},${SETTINGS.margin.top})`);

    // Create tooltip div
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // Create tree layout with custom sizing
    const treeLayout = d3.tree()
        .size([metrics.treeWidth * 3, SETTINGS.size.innerHeight * 3])
        .separation((a, b) => {
            // Enhanced separation logic
            const depthFactor = Math.pow(0.7, Math.min(a.depth, b.depth)); // Increased from 0.5 to 0.7
            const baseSeparation = SETTINGS.tree.minSplitWidth / metrics.treeWidth;
            
            // Reduce depth multiplier to allow closer horizontal spacing
            const depthMultiplier = Math.max(1, (metrics.maxDepth - a.depth) * 2); // Reduced from 10 to 2
            const separationMultiplier = a.parent === b.parent ? 
                depthMultiplier : depthMultiplier * 1.5; // Reduced multiplier for non-siblings
            
            // Enhanced leaf node handling
            const aLeaves = a.leaves().length;
            const bLeaves = b.leaves().length;
            const leafFactor = Math.max(aLeaves, bLeaves) / root.leaves().length;
            
            // Additional spacing for leaf nodes
            const isLeafParent = a.children?.[0]?.data.is_leaf || b.children?.[0]?.data.is_leaf;
            const leafParentBonus = isLeafParent ? 1.2 : 1; // Reduced from 1.5 to 1.2
            
            return Math.max(
                baseSeparation * separationMultiplier * leafParentBonus,
                (leafFactor + depthFactor) * baseSeparation * 1.5 // Reduced multiplier from 2 to 1.5
            );
        });

    // Generate tree layout
    const treeData = treeLayout(root);

    // Custom path generator for angled splits
    function createSplitPath(d) {
        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;
        
        // Calculate control point for the curve
        const midY = (sourceY + targetY) / 2;
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY = midY - Math.abs(targetX - sourceX) * Math.tan(SETTINGS.tree.radianAngle / 2);
        
        return `M${sourceX},${sourceY}
                Q${controlX},${controlY}
                ${targetX},${targetY}`;
    }

    // Calculate initial transform
    const initialTransform = {
        x: (SETTINGS.size.innerWidth - metrics.treeWidth) / 2,  // Use the root node's x, or fallback to centering
        y: 0,
        k: Math.min(1, SETTINGS.size.innerWidth / metrics.treeWidth)
    };

    // Add background layer for dragging
    contentGroup.append("rect")
        .attr("width", Math.max(SETTINGS.size.innerWidth, metrics.treeWidth))
        .attr("height", SETTINGS.size.innerHeight * 3) // Match the new height from tree layout
        .style("fill", "transparent")
        .style("pointer-events", "all");

    // Add links with dynamic stroke width and custom path
    contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`)
        .attr("d", createSplitPath)
        .style("fill", "none")
        .style("stroke", "#ccc");

    // Create nodes
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Function to generate a random color
    const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    // Generate classColorMap dynamically based on unique class labels
    const classColorMap = {};
    const uniqueClasses = [...new Set(rawTreeData.map(d => d.class_label))]; // Assuming 'data' contains your nodes

    uniqueClasses.forEach(classLabel => {
        classColorMap[classLabel] = getRandomColor(); // Assign a random color to each class
    });

    // Add circles to nodes with dynamic sizing
    nodes
        .append("circle")
        .attr("r", (d) => {
            if (d.depth === 0) return metrics.nodeRadius * 1.5;
            if (d.data.is_leaf) return metrics.nodeRadius * 1.2;
            return metrics.nodeRadius;
        })
        .style("fill", (d) => {
            if (d.data.is_leaf) {
                // Use the classColorMap to assign colors based on class_label
                return classColorMap[d.data.class_label] || getRandomColor(); // Fallback to random color if class not found
            }
            return "#FFA726";
        })
        .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`)
        .on("mouseover", function (event, d) {
            let content = `<strong>Node ID:</strong> ${d.data.node_id}<br>`;
            // leaf
            if (d.data.class_label !== null) {
                content += `<strong>Class:</strong> ${d.data.class_label}<br>`;
            }
            // split
            if (d.data.feature_name !== null) {
                content += `<strong>Split:</strong>${d.data.feature_name} > ${d.data.threshold.toFixed(2)}<br>`;
            }
            
            tooltip
                .html(content)
                .style("visibility", "visible")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");

            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
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
                .style("stroke-width", `${Math.max(1, metrics.scaleFactor * 2)}px`);
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

                    link.style("stroke", "red")
                        .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
                    currentNode = currentNode.parent;
                }

                d3.select(this)
                    .select("circle")
                    .style("stroke", "red")
                    .style("stroke-width", `${Math.max(2, metrics.scaleFactor * 3)}px`);
            }
        });

    // Apply initial transform
    contentGroup.attr("transform", 
        `translate(${initialTransform.x + SETTINGS.margin.left},${SETTINGS.margin.top}) scale(${initialTransform.k})`
    );

    // Initialize zoom behavior
    let currentTransform = d3.zoomIdentity
        .translate(initialTransform.x, 0)
        .scale(initialTransform.k);

    const zoom = d3.zoom()
        .scaleExtent([0.1, SETTINGS.node.maxZoom])
        .on("zoom", function(event) {
            currentTransform = event.transform;
            contentGroup.attr("transform", 
                `translate(${event.transform.x + SETTINGS.margin.left},${event.transform.y + SETTINGS.margin.top}) scale(${event.transform.k})`
            );
        });

    // Apply zoom behavior to the SVG
    svg.call(zoom);

    // Drag handling
    let isDragging = false;
    let dragStartX, dragStartY;

    svg.on("mousedown", function(event) {
        if (event.target.tagName === "circle") return;
        isDragging = true;
        dragStartX = event.clientX - currentTransform.x;
        dragStartY = event.clientY - currentTransform.y;
    });

    svg.on("mousemove", function(event) {
        if (!isDragging) return;
        
        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        
        currentTransform.x = dx;
        currentTransform.y = dy;
        
        contentGroup.attr("transform", 
            `translate(${dx + SETTINGS.margin.left},${dy + SETTINGS.margin.top}) scale(${currentTransform.k})`
        );
    });

    svg.on("mouseup", function() {
        isDragging = false;
    });

    svg.on("mouseleave", function() {
        isDragging = false;
    });
}

document.addEventListener("DOMContentLoaded", () => fetchTreeData());