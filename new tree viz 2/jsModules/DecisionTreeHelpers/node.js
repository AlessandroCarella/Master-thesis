import { calculateNodeRadius } from "./metrics.js";

// Function to get node color based on class
export function getNodeColor(d, colorMap, SETTINGS) {
    if (d.data.is_leaf && d.data.class_label !== undefined) {
        return colorMap[d.data.class_label] || SETTINGS.visual.colors.nodeDefaultLeaf;
    }
    return SETTINGS.visual.colors.nodeDefault; // Default for non-leaf nodes
}

// Helper function to check if a node is in the instance path
function isNodeInPath(nodeId, instancePath) {
    return instancePath && instancePath.includes(nodeId);
}

// Function to get instance value for a feature
function getInstanceValue(featureName, instanceData) {
    if (!instanceData || !featureName) return null;
    return instanceData[featureName];
}

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap,
    instancePath = [],
    instanceData = null
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
            // Rectangle for path nodes with settings-based dimensions
            element.append("rect")
                .attr("x", -SETTINGS.visual.rectWidth / 2)
                .attr("y", -SETTINGS.visual.rectHeight / 2)
                .attr("width", SETTINGS.visual.rectWidth)
                .attr("height", SETTINGS.visual.rectHeight)
                .attr("rx", SETTINGS.visual.rectBorderRadius)
                .attr("ry", SETTINGS.visual.rectBorderRadius)
                .style("fill", getNodeColor(d, colorMap, SETTINGS))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth * SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                .style("stroke", SETTINGS.visual.colors.pathHighlightStroke)
                .style("opacity", SETTINGS.visual.opacity.pathHighlight);

            // Add text for path nodes
            if (!d.data.is_leaf) {
                // Decision node - show split condition
                const featureName = d.data.feature_name || 'Unknown';
                const threshold = d.data.threshold !== undefined ? d.data.threshold.toFixed(2) : 'N/A';
                const instanceValue = getInstanceValue(featureName, instanceData);
                
                // Split condition text
                element.append("text")
                    .attr("x", 0)
                    .attr("y", SETTINGS.visual.textOffsets.splitConditionY)
                    .attr("text-anchor", "middle")
                    .style("font-size", SETTINGS.visual.fonts.splitCondition.size)
                    .style("font-weight", SETTINGS.visual.fonts.splitCondition.weight)
                    .style("fill", SETTINGS.visual.fonts.splitCondition.color)
                    .text(`${featureName} ≤ ${threshold}`);
                
                // Instance value text
                if (instanceValue !== null && instanceValue !== undefined) {
                    element.append("text")
                        .attr("x", 0)
                        .attr("y", SETTINGS.visual.textOffsets.instanceValueY)
                        .attr("text-anchor", "middle")
                        .style("font-size", SETTINGS.visual.fonts.instanceValue.size)
                        .style("font-weight", SETTINGS.visual.fonts.instanceValue.weight)
                        .style("fill", SETTINGS.visual.fonts.instanceValue.color)
                        .text(`Instance: ${typeof instanceValue === 'number' ? instanceValue.toFixed(2) : instanceValue}`);
                }
            } else {
                // Leaf node - show class prediction
                element.append("text")
                    .attr("x", 0)
                    .attr("y", SETTINGS.visual.textOffsets.predictionLabelY)
                    .attr("text-anchor", "middle")
                    .style("font-size", SETTINGS.visual.fonts.predictionLabel.size)
                    .style("font-weight", SETTINGS.visual.fonts.predictionLabel.weight)
                    .style("fill", SETTINGS.visual.fonts.predictionLabel.color)
                    .text("PREDICTION");
                
                element.append("text")
                    .attr("x", 0)
                    .attr("y", SETTINGS.visual.textOffsets.predictionValueY)
                    .attr("text-anchor", "middle")
                    .style("font-size", SETTINGS.visual.fonts.predictionValue.size)
                    .style("font-weight", SETTINGS.visual.fonts.predictionValue.weight)
                    .style("fill", SETTINGS.visual.fonts.predictionValue.color)
                    .text(`${d.data.class_label}`);
            }
        } else {
            // Circle for non-path nodes
            element.append("circle")
                .attr("r", baseRadius)
                .style("fill", getNodeColor(d, colorMap, SETTINGS))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", SETTINGS.visual.colors.nodeStroke)
                .style("opacity", SETTINGS.visual.opacity.normal);
        }
    });

    // Add event handlers to both circles and rectangles
    nodes.selectAll("circle, rect")
        .attr("data-in-path", (d) => isNodeInPath(d.data.node_id, instancePath))
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, instancePath, SETTINGS)
        );

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    // Extract tooltip content creation to a separate function
    const content = createNodeTooltipContent(d, instancePath);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget).style("stroke", SETTINGS.visual.colors.highlight);
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

export function handleMouseOut(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    tooltip.style("visibility", "hidden");
    
    const isInPath = isNodeInPath(d.data.node_id, instancePath);
    const strokeColor = isInPath ? SETTINGS.visual.colors.pathHighlightStroke : SETTINGS.visual.colors.nodeStroke;
    const strokeWidth = isInPath ? `${metrics.nodeBorderStrokeWidth * SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px` : `${metrics.nodeBorderStrokeWidth}px`;
    const opacity = isInPath ? SETTINGS.visual.opacity.pathHighlight : SETTINGS.visual.opacity.normal;
    
    d3.select(event.currentTarget)
        .style("stroke", strokeColor)
        .style("stroke-width", strokeWidth)
        .style("opacity", opacity);
}