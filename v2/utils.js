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
        linkFade: 300,
        shapeMorph: 400,
        position: 500,
        stagger: 100,
    },
};

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
