// Configuration
const CONFIG = {
    width: 800,
    height: 800,
    margin: { top: 90, right: 90, bottom: 90, left: 90 },
    node: {
        radius: 12,
        strokeWidth: 3,
        rectWidth: 150,
        rectHeight: 100,
        borderRadius: 8,
    },
    colors: {
        trueLink: "#006837",
        falseLink: "#A50026",
        defaultLink: "#999",
        nodeStroke: "#333",
        pathHighlight: "#FFA500",
    },
    transition: {
        duration: 600,
    },
};

// Global state
let treeData,
    instanceData,
    scatterData,
    hierarchyRoot,
    svg,
    contentGroup,
    tooltip;
let currentMode = "blocks"; // 'classic' or 'blocks'

// Initialize visualization
async function init() {
    try {
        [treeData, instanceData, scatterData] = await Promise.all([
            d3.json("data/tree_adult5_500_originalDataset_no.json"),
            d3.json("data/adult5_instance.json"),
            d3
                .json("data/scatter_adult5_500_originalDataset_no.json")
                .catch(() => null),
        ]);

        hierarchyRoot = buildHierarchy(treeData);
        setupButtons();
        createVisualization();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Setup button handlers
function setupButtons() {
    d3.select("#btn-classic").on("click", () => switchMode("classic"));
    d3.select("#btn-blocks").on("click", () => switchMode("blocks"));
}

// Switch between visualization modes
function switchMode(mode) {
    if (mode === currentMode) return;

    currentMode = mode;
    d3.selectAll(".btn").classed("active", false);
    d3.select(`#btn-${mode}`).classed("active", true);

    createVisualization();
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

// Get all root-to-leaf paths
function getAllPaths(node, currentPath = []) {
    if (!node) return [];

    const newPath = [...currentPath, node.node_id];

    if (node.is_leaf) {
        return [newPath];
    }

    const paths = [];
    if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
            paths.push(...getAllPaths(child, newPath));
        });
    }

    return paths;
}

// Create curved path for links (classic mode)
function createCurvedPath(source, target) {
    const midY = (source.y + target.y) / 2;
    const controlX = source.x + (target.x - source.x) / 2;
    const controlY = midY;
    return `M${source.x},${source.y} Q${controlX},${controlY} ${target.x},${target.y}`;
}

// Determine link color
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
function getNodeColor(nodeData) {
    if (nodeData.is_leaf && nodeData.class_label !== undefined) {
        const classColors = [
            "#e41a1c",
            "#377eb8",
            "#4daf4a",
            "#984ea3",
            "#ff7f00",
        ];
        return classColors[nodeData.class_label % classColors.length];
    }
    return "#ddd";
}

// Calculate stroke width
function getStrokeWidth(samples, totalSamples) {
    const ratio = samples / totalSamples;
    return Math.max(1, Math.min(8, ratio * 8));
}

// Helper functions for blocks layout
function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

function findBranchPoint(path, instancePath) {
    if (!path || !instancePath) return 0;
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) {
            branchPoint = i;
        } else {
            break;
        }
    }
    return branchPoint;
}

function getNodeLabelById(nodeId) {
    const nodeData = treeData.find((n) => n.node_id === nodeId);
    if (!nodeData) return `Node ${nodeId}`;

    if (nodeData.is_leaf) {
        return nodeData.class_label;
    }

    const threshold = Number(nodeData.threshold) ?? 0;
    const thresholdStr = Number.isFinite(threshold)
        ? threshold.toFixed(1)
        : threshold;
    return `${nodeData.feature_name} ≤ ${thresholdStr}`;
}

function getNodeLabelForDisplay(nodeData) {
    if (nodeData.is_leaf) {
        return `Class ${nodeData.class_label}`;
    }
    return `${nodeData.feature_name}\n≤ ${nodeData.threshold.toFixed(2)}`;
}

function calculateBlocksMetrics(allPaths) {
    const allNodes = new Set();
    allPaths.forEach((path) => path.forEach((id) => allNodes.add(id)));
    const totalNodes = allNodes.size;
    const nodeScaleFactor = Math.max(1, Math.sqrt(totalNodes / 100));
    const maxDepth = Math.max(...allPaths.map((p) => p.length - 1));
    const minSpacing = 100;
    const scaleFactorMultiplier = 1.5;

    return {
        totalNodes,
        maxDepth,
        nodeScaleFactor,
        nodeSpacing: minSpacing * nodeScaleFactor,
        requiredWidth: (maxDepth + 1) * minSpacing * nodeScaleFactor * 2,
        requiredHeight:
            allPaths.length *
            minSpacing *
            nodeScaleFactor *
            scaleFactorMultiplier,
        nodeStrokeWidth: CONFIG.node.strokeWidth,
        linkStrokeWidth: CONFIG.node.strokeWidth,
    };
}

function depthAlignedLayout(allPaths, instancePath, metrics) {
    const positions = {};

    const effectiveWidth = Math.max(CONFIG.width, metrics.requiredWidth);
    const effectiveHeight = Math.max(CONFIG.height, metrics.requiredHeight);

    const margin = {
        top: CONFIG.margin.top * metrics.nodeScaleFactor,
        right: CONFIG.margin.right * metrics.nodeScaleFactor,
        bottom: CONFIG.margin.bottom * metrics.nodeScaleFactor,
        left: CONFIG.margin.left * metrics.nodeScaleFactor,
    };

    const availableWidth = effectiveWidth - margin.left - margin.right;
    const availableHeight = effectiveHeight - margin.top - margin.bottom;

    // Calculate X positions for each depth
    const depthToX = {};
    for (let depth = 0; depth <= metrics.maxDepth; depth++) {
        depthToX[depth] =
            margin.left +
            (metrics.maxDepth === 0
                ? 0
                : depth * (availableWidth / metrics.maxDepth));
    }

    // Place instance path at bottom
    const bottomY = effectiveHeight - margin.bottom;
    instancePath.forEach((nodeId, depth) => {
        positions[nodeId] = {
            id: nodeId,
            x: depthToX[depth],
            y: bottomY,
            label: getNodeLabelById(nodeId),
        };
    });

    // Place other paths above
    const otherPaths = allPaths.filter((p) => !arraysEqual(p, instancePath));
    const sortedOtherPaths = otherPaths.sort(
        (a, b) =>
            findBranchPoint(a, instancePath) - findBranchPoint(b, instancePath)
    );

    const availableSpaceAbove = availableHeight - margin.bottom * 2;
    const pathSpacing = Math.max(
        metrics.nodeSpacing,
        availableSpaceAbove / Math.max(1, sortedOtherPaths.length)
    );

    sortedOtherPaths.forEach((path, idx) => {
        const y = margin.top + idx * pathSpacing;
        path.forEach((nodeId, depth) => {
            if (!positions[nodeId]) {
                positions[nodeId] = {
                    id: nodeId,
                    x: depthToX[depth],
                    y,
                    label: getNodeLabelById(nodeId),
                };
            }
        });
    });

    return { positions, width: effectiveWidth, height: effectiveHeight };
}

// Create the tree visualization
function createVisualization() {
    const innerWidth = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
    const innerHeight =
        CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;

    d3.select("#tree-container").selectAll("*").remove();

    tooltip = d3.select(".tooltip");

    if (currentMode === "classic") {
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

        renderClassicTree(innerWidth, innerHeight);

        // Add zoom
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
    } else {
        // For blocks tree, calculate layout first to get proper dimensions
        const allPaths = getAllPaths(hierarchyRoot);
        const instancePath = instanceData
            ? findInstancePath(hierarchyRoot, instanceData)
            : allPaths[0] || [];
        const metrics = calculateBlocksMetrics(allPaths);
        const layout = depthAlignedLayout(allPaths, instancePath, metrics);

        svg = d3
            .select("#tree-container")
            .append("svg")
            .attr("width", CONFIG.width)
            .attr("height", CONFIG.height)
            .attr("viewBox", `0 0 ${layout.width} ${layout.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        contentGroup = svg.append("g");

        renderBlocksTree(innerWidth, innerHeight);

        // Add zoom
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 20])
            .on("zoom", (event) => {
                contentGroup.attr("transform", event.transform);
            });

        svg.call(zoom);
    }
}

// Create the tree visualization
function createVisualization() {
    const innerWidth = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
    const innerHeight =
        CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;

    d3.select("#tree-container").selectAll("*").remove();

    tooltip = d3.select(".tooltip");

    if (currentMode === "classic") {
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

        renderClassicTree(innerWidth, innerHeight);

        // Add zoom
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
    } else {
        // For blocks tree, calculate layout first to get proper dimensions
        const allPaths = getAllPaths(hierarchyRoot);
        const instancePath = instanceData
            ? findInstancePath(hierarchyRoot, instanceData)
            : allPaths[0] || [];
        const metrics = calculateBlocksMetrics(allPaths);
        const layout = depthAlignedLayout(allPaths, instancePath, metrics);

        svg = d3
            .select("#tree-container")
            .append("svg")
            .attr("width", CONFIG.width)
            .attr("height", CONFIG.height)
            .attr("viewBox", `0 0 ${layout.width} ${layout.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        contentGroup = svg.append("g");

        renderBlocksTree(allPaths, instancePath, layout.positions, metrics);

        // Add zoom
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 20])
            .on("zoom", (event) => {
                contentGroup.attr("transform", event.transform);
            });

        svg.call(zoom);
    }
}

// Render classic tree with circles and curves
function renderClassicTree(innerWidth, innerHeight) {
    const root = d3.hierarchy(hierarchyRoot);
    const treeLayout = d3
        .tree()
        .size([innerWidth, innerHeight])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2));

    const tree = treeLayout(root);
    const totalSamples = treeData[0].n_samples;

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
        .style("opacity", 0)
        .on("mouseover", (event, d) => showLinkTooltip(event, d))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    links.transition().duration(CONFIG.transition.duration).style("opacity", 1);

    // Add nodes
    const nodes = contentGroup
        .selectAll(".node")
        .data(tree.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .style("opacity", 0);

    nodes
        .append("circle")
        .attr("r", CONFIG.node.radius)
        .style("fill", (d) => getNodeColor(d.data))
        .style("stroke", CONFIG.colors.nodeStroke)
        .style("stroke-width", CONFIG.node.strokeWidth)
        .on("mouseover", (event, d) => showNodeTooltip(event, d.data))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    nodes.transition().duration(CONFIG.transition.duration).style("opacity", 1);

    highlightInstancePath(tree);
}

// Render blocks tree with rectangles
function renderBlocksTree(allPaths, instancePath, nodePositions, metrics) {
    // Create links
    const links = [];
    const linkSet = new Set();

    allPaths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
            const key = `${path[i]}-${path[i + 1]}`;
            if (!linkSet.has(key)) {
                linkSet.add(key);
                links.push({
                    source: nodePositions[path[i]],
                    target: nodePositions[path[i + 1]],
                    sourceId: path[i],
                    targetId: path[i + 1],
                });
            }
        }
    });

    const totalSamples = treeData[0].n_samples;

    // Render links
    const linkElements = contentGroup
        .selectAll(".link")
        .data(links)
        .join("line")
        .attr("class", "link")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .style("stroke", (d) => {
            const sourceNode = treeData.find((n) => n.node_id === d.sourceId);
            return getLinkColor({ data: sourceNode }, d.targetId);
        })
        .style("stroke-width", (d) => {
            const targetNode = treeData.find((n) => n.node_id === d.targetId);
            const samples =
                targetNode.weighted_n_samples || targetNode.n_samples;
            return getStrokeWidth(samples, totalSamples) + "px";
        })
        .style("opacity", 0)
        .on("mouseover", (event, d) => showBlocksLinkTooltip(event, d))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    linkElements
        .transition()
        .duration(CONFIG.transition.duration)
        .style("opacity", 1);

    // Render nodes
    const nodeData = Object.values(nodePositions);
    const nodeElements = contentGroup
        .selectAll(".node")
        .data(nodeData)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .style("opacity", 0);

    nodeElements
        .append("rect")
        .attr("x", -CONFIG.node.rectWidth / 2)
        .attr("y", -CONFIG.node.rectHeight / 2)
        .attr("width", CONFIG.node.rectWidth)
        .attr("height", CONFIG.node.rectHeight)
        .attr("rx", CONFIG.node.borderRadius)
        .style("fill", (d) => {
            const nodeData = treeData.find((n) => n.node_id === d.id);
            return getNodeColor(nodeData);
        })
        .on("mouseover", (event, d) => {
            const nodeData = treeData.find((n) => n.node_id === d.id);
            showNodeTooltip(event, nodeData);
        })
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    // Add labels
    nodeElements.each(function (d) {
        const nodeData = treeData.find((n) => n.node_id === d.id);
        const label = getNodeLabelForDisplay(nodeData);
        const lines = label.split("\n");
        const fontSize = Math.min(
            14,
            80 / Math.max(...lines.map((l) => l.length))
        );

        lines.forEach((line, i) => {
            d3.select(this)
                .append("text")
                .attr("class", "node-label")
                .attr("y", (i - (lines.length - 1) / 2) * fontSize * 1.2)
                .style("font-size", `${fontSize}px`)
                .text(line);
        });
    });

    nodeElements
        .transition()
        .duration(CONFIG.transition.duration)
        .style("opacity", 1);
}

// Highlight instance path
function highlightInstancePath(tree) {
    if (!instanceData) return;

    const path = findInstancePath(hierarchyRoot, instanceData);
    if (!path || path.length < 2) return;

    const linkPairs = path.slice(0, -1).map((source, i) => ({
        source,
        target: path[i + 1],
    }));

    contentGroup
        .selectAll(".link")
        .filter(function (d) {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;
            return linkPairs.some(
                (pair) => pair.source === sourceId && pair.target === targetId
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
                .style("opacity", 0)
                .lower()
                .transition()
                .duration(CONFIG.transition.duration)
                .style("opacity", 0.6);
        });
}

// Find path for instance
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

// Tooltip functions
function showNodeTooltip(event, nodeData) {
    let content = [];

    if (nodeData.is_leaf) {
        content.push(`<strong>Class:</strong> ${nodeData.class_label}`);
    } else {
        content.push(
            `<strong>Split:</strong> ${
                nodeData.feature_name
            } ≤ ${nodeData.threshold.toFixed(2)}`
        );
        content.push(
            `<strong>Impurity:</strong> ${nodeData.impurity.toFixed(4)}`
        );
    }

    content.push(`<strong>Samples:</strong> ${nodeData.n_samples}`);

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

function showLinkTooltip(event, link) {
    const source = link.source.data;
    const targetId = link.target.data.node_id;

    let linkType =
        targetId === source.left_child
            ? "True (≤ threshold)"
            : "False (> threshold)";
    let content = [`<strong>Direction:</strong> ${linkType}`];

    if (source.feature_name) {
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

function showBlocksLinkTooltip(event, link) {
    const sourceNode = treeData.find((n) => n.node_id === link.sourceId);
    let linkType =
        link.targetId === sourceNode.left_child
            ? "True (≤ threshold)"
            : "False (> threshold)";

    let content = [`<strong>Direction:</strong> ${linkType}`];
    if (sourceNode && sourceNode.feature_name) {
        content.push(
            `<strong>Split:</strong> ${
                sourceNode.feature_name
            } ≤ ${sourceNode.threshold.toFixed(2)}`
        );
    }

    tooltip
        .html(content.join("<br>"))
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

function moveTooltip(event) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

function hideTooltip() {
    tooltip.style("visibility", "hidden");
}

// Start
init();
