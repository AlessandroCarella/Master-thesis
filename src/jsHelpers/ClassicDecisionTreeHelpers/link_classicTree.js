import { colorScheme } from "../visualizationConnector.js";
import { getStrokeWidth } from "./metrics_classicTree.js"

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
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            // Calculate and store the original stroke width based on samples
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples, 
                treeData.data.n_samples, 
                metrics.linkStrokeWidth
            );
            // Store as data attribute for later retrieval
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
        })
        .style("stroke-width", function(d) {
            // Use the stored original stroke width
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .attr("d", (d) => createSplitPath(d, SETTINGS))
        .style("fill", "none")
        .style("stroke", colorScheme.ui.linkStroke);
}

export function highlightInstancePath(
    contentGroup,
    pathNodeIds,
    metrics,
    SETTINGS
) {
    // Add validation for pathNodeIds
    if (!contentGroup || !pathNodeIds) {
        console.warn("Missing required parameters for highlightInstancePath");
        return;
    }

    // Reset any existing path highlights
    contentGroup
        .selectAll(".link.instance-path")
        .classed("instance-path", false);
    contentGroup.selectAll(".link-highlight").remove();

    if (!pathNodeIds || pathNodeIds.length < 2) return;

    // Create an array of link identifiers (source-target pairs)
    const linkPairs = pathNodeIds.slice(0, -1).map((source, i) => ({
        source,
        target: pathNodeIds[i + 1],
    }));

    // Add highlights
    contentGroup
        .selectAll(".link")
        .filter((d) => {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;

            return linkPairs.some(
                (pair) => pair.source === sourceId && pair.target === targetId
            );
        })
        .each(function () {
            const originalPath = d3.select(this);
            const pathD = originalPath.attr("d");
            // Use the stored original stroke width instead of parseFloat
            const baseStrokeWidth = parseFloat(
                originalPath.attr("data-original-stroke-width")
            );

            contentGroup
                .append("path")
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", colorScheme.ui.instancePathHighlight)
                .style(
                    "stroke-width",
                    `${baseStrokeWidth * 2}px`
                )
                .style("fill", "none")
                .style("opacity", colorScheme.opacity.originalInstancePath)
                .lower();

            originalPath.classed("instance-path", true);
        });
}
