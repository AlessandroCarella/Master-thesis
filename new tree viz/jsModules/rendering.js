import { state } from "./state.js";
import {
    CONTAINER_WIDTH,
    CONTAINER_HEIGHT,
    RECT_WIDTH,
    RECT_HEIGHT,
} from "./constants.js";
import { depthAlignedLayout } from "./layout.js";
import { calculateFontSize } from "./utils.js";
import {
    traceInstancePath,
    getAllPathsFromHierarchy,
    getNodeColor,
    getStrokeWidth,
    getNodeById,
} from "./treeModel.js";
import { createTooltip, showTooltip, hideTooltip } from "./tooltip.js";

// Build label content
function getNodeLabelLines(nodeId, instance) {
    const node = getNodeById(nodeId);
    if (!node) return [`Node ${nodeId}`];

    if (node.is_leaf) {
        return [node.class_label || "Unknown"];
    }
    const th = Number(node.threshold) ?? 0;
    return [
        `${node.feature_name} > ${Number.isFinite(th) ? th.toFixed(3) : th}`,
        `Instance: ${instance?.[node.feature_name]}`,
    ];
}

function getNodeLabel(nodeId, instance) {
    const lines = getNodeLabelLines(nodeId, instance);
    return lines.join("\n");
}

function createLinks(allPaths, nodePositions) {
    const links = [];
    const added = new Set();

    allPaths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
            const sourceId = path[i];
            const targetId = path[i + 1];
            const id = `${sourceId}-${targetId}`;
            if (!added.has(id)) {
                added.add(id);
                links.push({
                    source: nodePositions[sourceId],
                    target: nodePositions[targetId],
                    sourceId,
                    targetId,
                });
            }
        }
    });

    return links;
}

function isLinkHighlighted(link, instancePath) {
    const sIdx = instancePath.indexOf(link.sourceId);
    const tIdx = instancePath.indexOf(link.targetId);
    return sIdx !== -1 && tIdx !== -1 && Math.abs(sIdx - tIdx) === 1;
}

export function createVisualization() {
    // Clear previous visualization
    d3.select("#tree-container").selectAll("*").remove();

    const container = d3.select("#tree-container");
    const containerWidth = CONTAINER_WIDTH;
    const containerHeight = CONTAINER_HEIGHT;

    const tooltip = createTooltip();

    // Paths and layout
    const instancePath = traceInstancePath(state.instanceData);
    const allPaths = getAllPathsFromHierarchy();

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(
        allPaths,
        containerWidth,
        containerHeight,
        instancePath,
        getNodeLabel
    );

    const svg = container
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${effectiveWidth} ${effectiveHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    const zoom = d3
        .zoom()
        .scaleExtent([0.9, 100])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Links
    const links = createLinks(allPaths, nodePositions);
    g.selectAll(".link")
        .data(links)
        .enter()
        .append("line")
        .attr(
            "class",
            (d) =>
                `link ${
                    isLinkHighlighted(d, instancePath) ? "highlighted" : ""
                }`
        )
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .attr("stroke-width", (d) => `${getStrokeWidth(d.targetId)}px`);
        
    // Nodes
    const nodes = Object.values(nodePositions);

    g.selectAll(".node")
        .data(nodes)
        .enter()
        .append("rect")
        .attr(
            "class",
            (d) => `node ${instancePath.includes(d.id) ? "highlighted" : ""}`
        )
        .attr("x", (d) => d.x - RECT_WIDTH / 2)
        .attr("y", (d) => d.y - RECT_HEIGHT / 2)
        .attr("width", RECT_WIDTH)
        .attr("height", RECT_HEIGHT)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", (d) => getNodeColor(d.id))
        .on("mouseover", (event, d) => {
            showTooltip(event, d.id, tooltip);
        })
        .on("mouseout", () => {
            hideTooltip(tooltip);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY - 28}px`);
        });

    // Labels
    g.selectAll(".node-label-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-label-group")
        .each(function (d) {
            const group = d3.select(this);
            const lines = getNodeLabelLines(d.id, state.instanceData);
            const fontSize = calculateFontSize(lines, RECT_WIDTH, RECT_HEIGHT);
            const lineHeight = fontSize * 1.2;

            lines.forEach((line, idx) => {
                group
                    .append("text")
                    .attr("class", "node-label")
                    .attr("x", d.x)
                    .attr(
                        "y",
                        d.y + (idx - (lines.length - 1) / 2) * lineHeight
                    )
                    .style("font-size", `${fontSize}px`)
                    .text(line);
            });
        });
}
