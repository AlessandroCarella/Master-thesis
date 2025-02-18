export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "pca-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "12px")
        .style("pointer-events", "none")
        .style("max-width", "300px")
        .style("font-size", "12px")
        .style("line-height", "1.4");
}

export function showTooltip(event, d, data, tooltip) {
    // Get the index of the point in pcaData
    const pointIndex = event.target.__data__
        ? data.pcaData.findIndex(
              (p) =>
                  p[0] === event.target.__data__[0] &&
                  p[1] === event.target.__data__[1]
          )
        : -1;

    if (pointIndex === -1) {
        console.warn("Could not find matching point data");
        return;
    }

    const className = data.targets[pointIndex];
    const originalData = data.originalData[pointIndex];

    // Create tooltip content
    let tooltipContent = "<strong>Decoded Values:</strong><br>";
    Object.entries(originalData).forEach(([feature, value]) => {
        tooltipContent += `${feature}: ${
            typeof value === "number" ? value.toFixed(3) : value
        }<br>`;
    });
    tooltipContent += `<strong>Class: ${className}</strong>`;

    tooltip
        .html(tooltipContent)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}
