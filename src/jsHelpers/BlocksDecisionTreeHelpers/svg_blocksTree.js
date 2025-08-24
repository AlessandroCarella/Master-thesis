export function clearExistingSVG(containerSelector) {
    d3.select(`${containerSelector} svg`).remove();
    // Also clear the container content
    const container = document.querySelector(containerSelector);
    if (container) {
        container.innerHTML = '';
    }
}

export function createSVGContainer(containerSelector, effectiveWidth, effectiveHeight, SETTINGS) {
    const container = d3.select(containerSelector);
    
    const svg = container
        .append("svg")
        .attr("width", SETTINGS.size.width)
        .attr("height", SETTINGS.size.height)
        .attr("viewBox", `0 0 ${effectiveWidth} ${effectiveHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    return { svg, g, container };
}

export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "decision-tree-tooltip")
        .style("visibility", "hidden");
}

export function ensureVisualizationVisibility() {
    // Make sure the entire parent chain is visible
    const svgContainer = document.getElementById("svg-container");
    const blocksTreeContainer = document.getElementById("blocks-tree-plot");
    
    if (svgContainer) {
        svgContainer.style.display = "block";
        svgContainer.style.visibility = "visible";
    }
    
    if (blocksTreeContainer) {
        blocksTreeContainer.style.display = "block";
        blocksTreeContainer.style.visibility = "visible";
    }
}