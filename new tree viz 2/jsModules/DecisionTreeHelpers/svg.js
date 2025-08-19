export function clearExistingSVG() {
    d3.select("#tree-plot svg").remove();
    // Also remove any lingering tooltips
    d3.selectAll('.decision-tree-tooltip').remove();
}

export function createSVGContainer(SETTINGS) {
    return d3
        .select("#tree-plot")
        .append("svg")
        .attr(
            "width",
            SETTINGS.size.innerWidth +
                SETTINGS.margin.left +
                SETTINGS.margin.right
        )
        .attr(
            "height",
            SETTINGS.size.innerHeight +
                SETTINGS.margin.top +
                SETTINGS.margin.bottom
        );
}

export function createContentGroup(svg, SETTINGS) {
    return svg
        .append("g")
        .attr(
            "transform",
            `translate(${SETTINGS.margin.left},${SETTINGS.margin.top})`
        );
}

export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "decision-tree-tooltip")
        .style("visibility", "hidden");
}

export function addBackgroundLayer(contentGroup, SETTINGS, metrics) {
    contentGroup
        .append("rect")
        .attr("width", Math.max(SETTINGS.size.innerWidth, metrics.treeWidth))
        .attr("height", SETTINGS.size.innerHeight * 3)
        .style("fill", "transparent")
        .style("pointer-events", "all");
}