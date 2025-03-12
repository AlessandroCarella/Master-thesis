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
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .style("stroke-width", `${metrics.linkStrokeWidth}px`)
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

    // Extract this calculation to a separate function for reusability
    const highlightStrokeWidth = calculateHighlightStrokeWidth(
        metrics,
        SETTINGS
    );

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
            const baseStrokeWidth = parseFloat(
                originalPath.style("stroke-width")
            );

            contentGroup
                .append("path")
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", colorScheme.ui.instancePathHighlight)
                .style(
                    "stroke-width",
                    `${baseStrokeWidth + highlightStrokeWidth}px`
                )
                .style("fill", "none")
                .style("opacity", colorScheme.opacity.originalInstancePath)
                .lower();

            originalPath.classed("instance-path", true);
        });
}

function calculateHighlightStrokeWidth(metrics, SETTINGS) {
    return metrics
        ? parseFloat(metrics.linkStrokeWidth) +
              calculateHighlightThickness(metrics.totalNodes, SETTINGS)
        : 6; // Default fallback if metrics not provided
}

// Helper function to calculate highlight thickness based on tree size
function calculateHighlightThickness(totalNodes, SETTINGS) {
    if (!totalNodes || !SETTINGS) return 6; // Default fallback

    // Scale highlight thickness inversely with tree size
    // Larger trees get thinner highlights to avoid visual clutter
    const minThickness = 3;
    const maxThickness = 12;
    const baseThickness = 6;

    // Use logarithmic scaling to handle trees of different sizes
    const scale = Math.max(0.5, Math.min(2, 30 / Math.sqrt(totalNodes)));
    return Math.min(
        maxThickness,
        Math.max(minThickness, baseThickness * scale)
    );
}
