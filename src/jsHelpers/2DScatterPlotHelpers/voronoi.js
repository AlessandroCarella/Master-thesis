import { colorScheme } from "../visualizationConnector.js";

export function drawVoronoi(g, data, x, y, colorMap) {
    const voronoiGroup = g.append("g").attr("class", "voronoi-regions");

    data.decisionBoundary.regions.forEach((polygon, i) => {
        const regionClass = data.decisionBoundary.regionClasses[i];
        const regionColor = colorMap[regionClass];

        voronoiGroup
            .append("polygon")
            .attr(
                "points",
                polygon.map((d) => `${x(d[0])},${y(d[1])}`).join(" ")
            )
            .attr("fill", regionColor) // Use the class-specific color
            .attr("stroke", colorScheme.ui.linkStroke)
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.2); // Reduced opacity
    });
}
