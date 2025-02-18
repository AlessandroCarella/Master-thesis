import { colorScheme } from "../visualizationConnector.js";

export function createSplitPath({ source, target }, SETTINGS) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    const midY = (sourceY + targetY) / 2;
    const controlX = sourceX + (targetX - sourceX) / 2;
    const controlY =
        midY -
        Math.abs(targetX - sourceX) * Math.tan(SETTINGS.tree.radianAngle / 2);

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
}

export function addLinks(contentGroup, treeData, metrics, SETTINGS) {
    contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .style("stroke-width", `${metrics.linkStrokeWidth}px`)
        .attr("d", (d) => createSplitPath(d, SETTINGS))
        .style("fill", "none")
        .style("stroke", colorScheme.ui.linkStroke);
}
