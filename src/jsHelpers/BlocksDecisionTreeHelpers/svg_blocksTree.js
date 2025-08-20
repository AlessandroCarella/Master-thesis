import { CONTAINER_WIDTH, CONTAINER_HEIGHT } from "./settings_blocksTree.js";

export function createSVGContainer(containerSelector, effectiveWidth, effectiveHeight) {
    // Clear previous visualization
    d3.select(containerSelector).selectAll("*").remove();

    const container = d3.select(containerSelector);
    
    const svg = container
        .append("svg")
        .attr("width", CONTAINER_WIDTH)
        .attr("height", CONTAINER_HEIGHT)
        .attr("viewBox", `0 0 ${effectiveWidth} ${effectiveHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    return { svg, g, container };
}
