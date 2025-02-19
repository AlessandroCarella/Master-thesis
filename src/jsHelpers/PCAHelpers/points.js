import { colorScheme } from "../visualizationConnector.js";
import { showTooltip, hideTooltip } from "./tooltip.js";
import { togglePointColor } from "./tree.js"; // we'll export togglePointColor from treeHelper

export function createPoints(
    g,
    data,
    x,
    y,
    colorMap,
    tooltip,
    treeVisualization
) {
    const symbolGenerator = d3.symbol().size(100);

    const points = g
        .selectAll("path.point")
        .data(data.pcaData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", (d, i) =>
            symbolGenerator.type(i === 0 ? d3.symbolStar : d3.symbolCircle)()
        )
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", 1)
        .style("opacity", colorScheme.opacity.hover)
        .on("mouseover", (event, d) => {
            showTooltip(event, d, data, tooltip);
            d3.select(event.currentTarget)
                .style("opacity", colorScheme.opacity.active)
                .style("stroke", colorScheme.ui.highlight);
        })
        .on("mouseout", (event) => {
            hideTooltip(tooltip);
            d3.select(event.currentTarget)
                .style("opacity", colorScheme.opacity.hover)
                .style("stroke", colorScheme.ui.nodeStroke);
        })
        .on("click", function (event, d) {
            togglePointColor(this, d, data, colorMap, treeVisualization);
        });

    // Bring the original instance on the top of all others
    points.filter((d, i) => i === 0).raise();

    return points;
}
