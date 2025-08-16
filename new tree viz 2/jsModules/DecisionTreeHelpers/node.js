// node.js - Updated with Rectangle Shapes for Path Nodes
import { calculateNodeRadius } from "./metrics.js";

// Color scheme for the visualization
const colorScheme = {
    ui: {
        nodeStroke: '#333',
        highlight: '#ff6b6b',
        pathHighlight: '#ff4444',
        pathHighlightStroke: '#cc0000'
    },
    opacity: {
        hover: 1,
        normal: 0.8,
        pathHighlight: 1
    }
};

// Function to get node color based on class
export function getNodeColor(d, colorMap) {
    if (d.data.is_leaf && d.data.class_label !== undefined) {
        return colorMap[d.data.class_label] || '#cccccc';
    }
    return '#e0e0e0'; // Default for non-leaf nodes
}

// Helper function to check if a node is in the instance path
function isNodeInPath(nodeId, instancePath) {
    return instancePath && instancePath.includes(nodeId);
}

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap,
    instancePath = []
) {
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add different shapes based on whether node is in path
    nodes.each(function(d) {
        const isInPath = isNodeInPath(d.data.node_id, instancePath);
        const baseRadius = calculateNodeRadius(d, metrics);
        const element = d3.select(this);
        
        if (isInPath) {
            // Rectangle for path nodes
            const rectWidth = baseRadius * 3;
            const rectHeight = baseRadius * 1.5;
            
            element.append("rect")
                .attr("x", -rectWidth / 2)
                .attr("y", -rectHeight / 2)
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 4) // Rounded corners
                .attr("ry", 4)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth * 1.5}px`)
                .style("stroke", colorScheme.ui.pathHighlightStroke)
                .style("opacity", colorScheme.opacity.pathHighlight);
        } else {
            // Circle for non-path nodes
            element.append("circle")
                .attr("r", baseRadius)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.normal);
        }
    });

    // Add event handlers to both circles and rectangles
    nodes.selectAll("circle, rect")
        .attr("data-in-path", (d) => isNodeInPath(d.data.node_id, instancePath))
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, instancePath)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, instancePath)
        );

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics, instancePath = []) {
    // Extract tooltip content creation to a separate function
    const content = createNodeTooltipContent(d, instancePath);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget).style("stroke", colorScheme.ui.highlight);
}

function createNodeTooltipContent(d, instancePath = []) {
    const content = [];

    // Node type and primary information
    if (d.data.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${d.data.class_label}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                d.data.feature_name
            } ≤ ${d.data.threshold.toFixed(2)}`
        );
        content.push(`<strong>Feature Index:</strong> ${d.data.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${d.data.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${d.data.n_samples}`);

    // Add weighted samples if available
    if (d.data.weighted_n_samples) {
        const weightDiff = Math.abs(
            d.data.weighted_n_samples - d.data.n_samples
        );
        // Only show if there's a meaningful difference
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${d.data.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    if (!d.data.is_leaf) {
        // Add class distribution if available (summarized)
        if (d.data.value && d.data.value.length > 0 && d.data.value[0].length > 0) {
            const valueArray = d.data.value[0];
            if (valueArray.length > 1) {
                const total = valueArray.reduce((sum, val) => sum + val, 0);
                const distribution = valueArray
                    .map((val) => ((val / total) * 100).toFixed(1) + "%")
                    .join(", ");
                content.push(
                    `<strong>Class Distribution:</strong> [${distribution}]`
                );
            }
        }
    }

    return content;
}

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(event, d, tooltip, metrics, instancePath = []) {
    tooltip.style("visibility", "hidden");
    
    const isInPath = isNodeInPath(d.data.node_id, instancePath);
    const strokeColor = isInPath ? colorScheme.ui.pathHighlightStroke : colorScheme.ui.nodeStroke;
    const strokeWidth = isInPath ? `${metrics.nodeBorderStrokeWidth * 1.5}px` : `${metrics.nodeBorderStrokeWidth}px`;
    const opacity = isInPath ? colorScheme.opacity.pathHighlight : colorScheme.opacity.normal;
    
    d3.select(event.currentTarget)
        .style("stroke", strokeColor)
        .style("stroke-width", strokeWidth)
        .style("opacity", opacity);
}