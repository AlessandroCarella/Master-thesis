import { TREES_SETTINGS } from "./settings.js";


export function clearExistingSVG(containerSelector, treeKind = "general") {
    d3.select(`${containerSelector} svg`).remove();
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        // Also clear the container content for blocks tree
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = "";
        }
    }
}

export function createSVGContainer(containerOrSelector, treeKind = "general", effectiveWidth = null, effectiveHeight = null) {
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        const container = d3.select(containerOrSelector);
        const svg = container
            .append("svg")
            .attr("width", TREES_SETTINGS.size.width)
            .attr("height", TREES_SETTINGS.size.height)
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
                TREES_SETTINGS.size.innerWidth +
                    TREES_SETTINGS.margin.left +
                    TREES_SETTINGS.margin.right
            )
            .attr(
                "height",
                TREES_SETTINGS.size.innerHeight +
                    TREES_SETTINGS.margin.top +
                    TREES_SETTINGS.margin.bottom
            );
    }
}

export function createContentGroup(svg) {
    return svg
        .append("g")
        .attr(
            "transform",
            `translate(${TREES_SETTINGS.margin.left},${TREES_SETTINGS.margin.top})`
        );
}

export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "decision-tree-tooltip")
        .style("visibility", "hidden");
}

export function addBackgroundLayer(contentGroup, metrics) {
    contentGroup
        .append("rect")
        .attr(
            "width",
            Math.max(TREES_SETTINGS.size.innerWidth, metrics.treeWidth)
        )
        .attr("height", TREES_SETTINGS.size.innerHeight * 3)
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

export function initializeZoom(svg, contentGroup) {
    const zoom = d3
        .zoom()
        .scaleExtent(TREES_SETTINGS.zoom.scaleExtent)
        .on("zoom", (event) => {
            contentGroup.attr("transform", event.transform);
        });
    svg.call(zoom);
    return zoom;
}
