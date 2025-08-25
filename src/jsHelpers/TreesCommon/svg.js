export function clearExistingSVG(containerSelector, treeKind = "general") {
    d3.select(`${containerSelector} svg`).remove();
    if (treeKind === "blocks") {
        // Also clear the container content for blocks tree
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = "";
        }
    }
}

export function createSVGContainer(
    SETTINGS,
    containerOrSelector,
    treeKind = "general",
    effectiveWidth = null,
    effectiveHeight = null
) {
    if (treeKind === "blocks") {
        const container = d3.select(containerOrSelector);
        const svg = container
            .append("svg")
            .attr("width", SETTINGS.size.width)
            .attr("height", SETTINGS.size.height)
            .attr("viewBox", `0 0 ${effectiveWidth} ${effectiveHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const g = svg.append("g");
        return { svg, g, container };
    } else {
        // Classic and spawn behavior
        return d3
            .select(containerOrSelector)
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

export function addBackgroundLayer(
    contentGroup,
    SETTINGS,
    metrics,
) {
    contentGroup
        .append("rect")
        .attr(
            "width",
            Math.max(SETTINGS.size.innerWidth, metrics.treeWidth)
        )
        .attr("height", SETTINGS.size.innerHeight * 3)
        .style("fill", "transparent")
        .style("pointer-events", "all");
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
