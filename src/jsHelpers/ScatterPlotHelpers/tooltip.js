export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "scatter-plot-tooltip")
}

export function showTooltip(event, data, tooltip) {
    const pointIndex = getPointIndex(event, data);
    if (pointIndex === -1) return;

    const className = data.targets[pointIndex];
    const originalData = data.originalData[pointIndex];

    let tooltipContent = "<strong>Decoded Values:</strong><br>";
    Object.entries(originalData).forEach(([feature, value]) => {
        tooltipContent += `${feature}: ${
            typeof value === "number" ? value.toFixed(3) : value
        }<br>`;
    });
    tooltipContent += `<strong>Class: ${className}</strong>`;

    showTooltipContent(event, tooltip, tooltipContent);
}

function getPointIndex(event, data) {
    const targetData = event.target.__data__;
    if (!targetData) return -1;

    const index = data.transformedData.findIndex(
        (p) => p[0] === targetData[0] && p[1] === targetData[1]
    );
    if (index === -1) console.warn("Could not find matching point data");
    return index;
}

function showTooltipContent(event, tooltip, content) {
    tooltip
        .html(content)
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`)
        .transition()
        .duration(200)
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}
