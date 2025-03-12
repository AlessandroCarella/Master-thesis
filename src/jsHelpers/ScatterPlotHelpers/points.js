import {
    colorScheme,
    setOriginalPointsNeighPointsBoolArray,
} from "../visualizationConnector.js";
import { showTooltip, hideTooltip } from "./tooltip.js";
import { togglePointColor } from "./tree.js";

export function createPoints(
    g,
    data,
    colorMap,
    tooltip,
    treeVisualization,
    x,
    y
) {
    setOriginalPointsNeighPointsBoolArray(
        data.originalPointsNeighPointsBoolArray
    );

    const defaultSymbolSize = 100;
    const starSymbolSize = defaultSymbolSize * 1.5; 

    // Last elements rendered appear on top of everything else,
    // in fact the original instance is at the end of the list
    const lastIndex = data.transformedData.length - 1;

    // Create all points normally
    const points = g
        .selectAll("path.point")
        .data(data.transformedData)
        .enter()
        .append("path")
        .attr("class", "point")
        .attr("transform", (d) => `translate(${x(d[0])},${y(d[1])})`)
        .attr("d", (d, i) => {
            // Use larger size for star symbol, default size for circles
            const size = i === lastIndex ? starSymbolSize : defaultSymbolSize;
            return d3
                .symbol()
                .size(size)
                .type(i === lastIndex ? d3.symbolStar : d3.symbolCircle)();
        })
        .style("fill", (d, i) => colorMap[data.targets[i]])
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", 1)
        .style("opacity", (d, i) =>
            data.originalPointsNeighPointsBoolArray[i]
                ? colorScheme.opacity.datasetPoint
                : colorScheme.opacity.neighPoint
        )
        .on("mouseover", (event, d) => {
            showTooltip(event, data, tooltip);
            d3.select(event.currentTarget).style(
                "stroke",
                colorScheme.ui.highlight
            );
        })
        .on("mouseout", (event) => {
            hideTooltip(tooltip);
            d3.select(event.currentTarget).style(
                "stroke",
                colorScheme.ui.nodeStroke
            );
        })
        .on("click", function (event, d) {
            togglePointColor(this, d, data, colorMap, treeVisualization);
        });

    return points;
}
