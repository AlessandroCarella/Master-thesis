// Configuration
const CONFIG = {
    width: 800,
    height: 800,
    margin: { top: 90, right: 90, bottom: 90, left: 90 },
    node: {
        radius: 12,
        strokeWidth: 3,
    },
    colors: {
        trueLink: "#006837",
        falseLink: "#A50026",
        defaultLink: "#999",
        nodeStroke: "#333",
        pathHighlight: "#FFA500",
    },
};

// Global state
let treeData, instanceData, hierarchyRoot, svg, contentGroup, tooltip;

// Initialize visualization
async function init() {
    try {
        // Load data
        [treeData, instanceData] = await Promise.all([
            d3.json("data/tree_adult5_500_originalDataset_no.json"),
            d3.json("data/scatter_adult5_500_originalDataset_no.json").catch(() => null),
        ]);

        // Build hierarchy
        hierarchyRoot = buildHierarchy(treeData);

        // Create visualization
        createVisualization();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Build D3 hierarchy from flat tree data
function buildHierarchy(nodes) {
    const nodeMap = new Map(
        nodes.map((n) => [n.node_id, { ...n, children: [] }])
    );
    let root = null;

    nodes.forEach((node) => {
        const n = nodeMap.get(node.node_id);
        if (node.node_id === 0) {
            root = n;
        }
        if (!node.is_leaf) {
            if (node.left_child !== undefined) {
                const leftChild = nodeMap.get(node.left_child);
                if (leftChild) n.children.push(leftChild);
            }
            if (node.right_child !== undefined) {
                const rightChild = nodeMap.get(node.right_child);
                if (rightChild) n.children.push(rightChild);
            }
        }
    });

    return root;
}

// Create curved path for links
function createCurvedPath(source, target) {
    const midY = (source.y + target.y) / 2;
    const controlX = source.x + (target.x - source.x) / 2;
    const controlY = midY - (Math.abs(target.x - source.x) * Math.tan(0)) / 2;
    return `M${source.x},${source.y} Q${controlX},${controlY} ${target.x},${target.y}`;
}

// Determine link color based on decision branch
function getLinkColor(source, targetId) {
    if (!source || !source.data || source.data.is_leaf) {
        return CONFIG.colors.defaultLink;
    }
    if (targetId === source.data.left_child) {
        return CONFIG.colors.trueLink;
    } else if (targetId === source.data.right_child) {
        return CONFIG.colors.falseLink;
    }
    return CONFIG.colors.defaultLink;
}

// Get node color based on class
function getNodeColor(node) {
    if (node.data.is_leaf && node.data.class_label !== undefined) {
        // Simple color scheme for binary classification
        const classColors = [
            "#e41a1c",
            "#377eb8",
            "#4daf4a",
            "#984ea3",
            "#ff7f00",
        ];
        return classColors[node.data.class_label % classColors.length];
    }
    return "#ddd";
}

// Calculate stroke width based on samples
function getStrokeWidth(samples, totalSamples) {
    const ratio = samples / totalSamples;
    const minWidth = 1;
    const maxWidth = 8;
    return Math.max(minWidth, Math.min(maxWidth, ratio * maxWidth));
}

// Create the tree visualization
function createVisualization() {
    const innerWidth = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
    const innerHeight =
        CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;

    // Create SVG
    svg = d3
        .select("#tree-container")
        .append("svg")
        .attr("width", CONFIG.width)
        .attr("height", CONFIG.height);

    contentGroup = svg
        .append("g")
        .attr(
            "transform",
            `translate(${CONFIG.margin.left},${CONFIG.margin.top})`
        );

    // Create tooltip
    tooltip = d3.select(".tooltip");

    // Create D3 hierarchy
    const root = d3.hierarchy(hierarchyRoot);

    // Create tree layout
    const treeLayout = d3
        .tree()
        .size([innerWidth, innerHeight])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2));

    const tree = treeLayout(root);

    // Get total samples for stroke width calculation
    const totalSamples = treeData[0].n_samples;

    // Add background for zoom
    contentGroup
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight * 3)
        .style("fill", "transparent")
        .style("pointer-events", "all");

    // Add links
    const links = contentGroup
        .selectAll(".link")
        .data(tree.links())
        .join("path")
        .attr("class", "link")
        .attr("d", (d) => createCurvedPath(d.source, d.target))
        .style("stroke", (d) => getLinkColor(d.source, d.target.data.node_id))
        .style("stroke-width", (d) => {
            const samples =
                d.target.data.weighted_n_samples || d.target.data.n_samples;
            return getStrokeWidth(samples, totalSamples) + "px";
        })
        .on("mouseover", function (event, d) {
            showLinkTooltip(event, d);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // Add nodes
    const nodes = contentGroup
        .selectAll(".node")
        .data(tree.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
        .append("circle")
        .attr("r", CONFIG.node.radius)
        .style("fill", (d) => getNodeColor(d))
        .style("stroke", CONFIG.colors.nodeStroke)
        .style("stroke-width", CONFIG.node.strokeWidth)
        .on("mouseover", function (event, d) {
            showNodeTooltip(event, d);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    // Add zoom behavior
    const zoom = d3
        .zoom()
        .scaleExtent([0.5, 20])
        .on("zoom", (event) => {
            contentGroup.attr(
                "transform",
                `translate(${CONFIG.margin.left + event.transform.x},${
                    CONFIG.margin.top + event.transform.y
                }) scale(${event.transform.k})`
            );
        });

    svg.call(zoom);

    // Highlight instance path if available
    if (instanceData) {
        highlightInstancePath(tree);
    }
}

// Show tooltip for nodes
function showNodeTooltip(event, node) {
    const d = node.data;
    let content = [];

    if (d.is_leaf) {
        content.push(`<strong>Class:</strong> ${d.class_label}`);
    } else {
        content.push(
            `<strong>Split:</strong> ${d.feature_name} ≤ ${d.threshold.toFixed(
                2
            )}`
        );
        content.push(`<strong>Feature Index:</strong> ${d.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${d.impurity.toFixed(4)}`);
    }

    content.push(`<strong>Samples:</strong> ${d.n_samples}`);

    if (
        d.weighted_n_samples &&
        Math.abs(d.weighted_n_samples - d.n_samples) > 0.01
    ) {
        content.push(
            `<strong>Weighted Samples:</strong> ${d.weighted_n_samples.toFixed(
                2
            )}`
        );
    }

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

// Show tooltip for links
function showLinkTooltip(event, link) {
    const source = link.source.data;
    const targetId = link.target.data.node_id;

    let linkType = "Unknown";
    if (targetId === source.left_child) {
        linkType = "True (≤ threshold)";
    } else if (targetId === source.right_child) {
        linkType = "False (> threshold)";
    }

    let content = [`<strong>Link Type:</strong> ${linkType}`];
    if (source.feature_name && source.threshold !== undefined) {
        content.push(
            `<strong>Split:</strong> ${
                source.feature_name
            } ≤ ${source.threshold.toFixed(2)}`
        );
    }

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

// Highlight the instance path through the tree
function highlightInstancePath(tree) {
    // Find path through tree for the instance
    const path = findInstancePath(hierarchyRoot, instanceData);
    if (!path || path.length < 2) return;

    // Create link pairs
    const linkPairs = path.slice(0, -1).map((source, i) => ({
        source,
        target: path[i + 1],
    }));

    // Highlight links
    contentGroup
        .selectAll(".link")
        .filter(function (d) {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;
            return linkPairs.some(
                (pair) => pair === sourceId && pair.target === targetId
            );
        })
        .each(function (d) {
            const pathD = d3.select(this).attr("d");
            const strokeWidth = parseFloat(
                d3.select(this).style("stroke-width")
            );

            contentGroup
                .append("path")
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", CONFIG.colors.pathHighlight)
                .style("stroke-width", strokeWidth * 3 + "px")
                .style("fill", "none")
                .style("opacity", 0.6)
                .lower();
        });
}

// Find path for instance through tree
function findInstancePath(node, instance) {
    if (!node || !instance) return [];

    const path = [node.node_id];
    let current = node;

    while (!current.is_leaf) {
        const featureName = current.feature_name;
        const threshold = current.threshold;
        const featureValue = instance[featureName];

        if (featureValue === undefined) break;

        if (featureValue <= threshold) {
            current = treeData.find((n) => n.node_id === current.left_child);
        } else {
            current = treeData.find((n) => n.node_id === current.right_child);
        }

        if (!current) break;
        path.push(current.node_id);
    }

    return path;
}

// Start the visualization
init();
