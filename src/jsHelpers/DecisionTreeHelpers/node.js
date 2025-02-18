import {
    colorScheme,
    getNodeColor,
    getPCAVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
    getSelectedNode,
} from "../visualizationConnector.js";
import { calculateNodeRadius } from "./metrics.js";

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap
) {
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
        .append("circle")
        .attr("r", (d) => calculateNodeRadius(d, metrics))
        .style("fill", (d) => getNodeColor(d, colorMap))
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("opacity", colorScheme.opacity.hover)
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics)
        );

    nodes.on("click", (event, d) =>
        handleTreeNodeClick(
            event,
            d,
            contentGroup,
            getTreeVisualization(),
            getPCAVisualization(),
            metrics
        )
    );

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics) {
    const content = [
        d.data.class_label !== null
            ? `<strong>Class:</strong> ${d.data.class_label}`
            : "",
        d.data.feature_name !== null
            ? `<strong>Split: </strong>${
                  d.data.feature_name
              } > ${d.data.threshold.toFixed(2)}`
            : "",
    ]
        .filter(Boolean)
        .join("<br>");

    tooltip
        .html(content)
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

    if (d !== getSelectedNode()) {
        d3.select(event.currentTarget)
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
            .style("opacity", colorScheme.opacity.active);
    }
}

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(event, d, tooltip, metrics) {
    tooltip.style("visibility", "hidden");

    // Only reset styles if this isn't the selected node
    if (d !== getSelectedNode()) {
        d3.select(event.currentTarget)
            .style("stroke", colorScheme.ui.nodeStroke)
            .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
            .style("opacity", colorScheme.opacity.hover);
    }
}
