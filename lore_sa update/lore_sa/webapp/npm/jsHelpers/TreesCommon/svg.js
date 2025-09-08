/**
 * @fileoverview SVG creation and management utilities for tree visualizations with zoom and tooltip support
 * @module svg
 * @author Generated documentation
 */

import { TREES_SETTINGS } from "./settings.js";

/**
 * Removes existing SVG elements from the specified container
 * @description Clears previous visualizations, with special handling for blocks tree containers
 * @param {string} containerSelector - CSS selector for the container element
 * @param {string} [treeKind="general"] - Type of tree visualization being cleared
 * @returns {void}
 * @example
 * clearExistingSVG("#scatter-plot", "blocks");
 * clearExistingSVG("#classic-tree-plot");
 */
export function clearExistingSVG(containerSelector, treeKind = "general") {
    d3.select(`${containerSelector} svg`).remove();
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = "";
        }
    }
}

/**
 * Creates an SVG container with appropriate dimensions and viewBox settings
 * @description Generates SVG elements with different configurations based on tree type
 * @param {string|HTMLElement} containerOrSelector - Container element or CSS selector
 * @param {string} [treeKind="general"] - Type of tree visualization
 * @param {number} [effectiveWidth=null] - Override width for viewBox (blocks tree only)
 * @param {number} [effectiveHeight=null] - Override height for viewBox (blocks tree only)
 * @returns {Object|d3.Selection} For blocks tree: object with svg, g, and container selections. For others: svg selection
 * @example
 * // Blocks tree
 * const { svg, g, container } = createSVGContainer("#blocks-tree", "blocks", 800, 600);
 * // Classic/spawn tree
 * const svg = createSVGContainer("#classic-tree", "classic");
 */
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

/**
 * Creates a content group within an SVG with standard margin transformations
 * @description Adds a transformed group element for content placement within margins
 * @param {d3.Selection} svg - D3 selection of the SVG element
 * @returns {d3.Selection} D3 selection of the created group element
 * @example
 * const contentGroup = createContentGroup(svgElement);
 */
export function createContentGroup(svg) {
    return svg
        .append("g")
        .attr(
            "transform",
            `translate(${TREES_SETTINGS.margin.left},${TREES_SETTINGS.margin.top})`
        );
}

/**
 * Creates a tooltip element for tree node interactions
 * @description Generates a hidden tooltip div attached to the document body
 * @returns {d3.Selection} D3 selection of the created tooltip element
 * @example
 * const tooltip = createTooltip();
 */
export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "decision-tree-tooltip")
        .style("visibility", "hidden");
}

/**
 * Adds a transparent background layer to capture mouse events
 * @description Creates a large transparent rectangle for zoom and pan interactions
 * @param {d3.Selection} contentGroup - D3 selection of the content group
 * @param {Object} metrics - Metrics object containing layout dimensions
 * @param {number} metrics.treeWidth - Calculated width of the tree layout
 * @returns {void}
 * @example
 * addBackgroundLayer(contentGroup, { treeWidth: 800 });
 */
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

/**
 * Ensures visualization containers are visible in the DOM
 * @description Sets display and visibility styles to make visualization containers accessible
 * @returns {void}
 * @example
 * ensureVisualizationVisibility();
 */
export function ensureVisualizationVisibility() {
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

/**
 * Initializes zoom behavior with dynamic scale constraints
 * @description Sets up D3 zoom behavior with automatic scale extent adjustment for content fitting
 * @param {d3.Selection} svg - D3 selection of the SVG element
 * @param {d3.Selection} contentGroup - D3 selection of the content group to transform
 * @param {number} [initialScale=null] - Initial scale factor, used to adjust minimum zoom if needed
 * @returns {d3.ZoomBehavior} The configured zoom behavior object
 * @example
 * const zoom = initializeZoom(svgElement, contentGroup, 0.5);
 */
export function initializeZoom(svg, contentGroup, initialScale = null) {
    let scaleExtent = TREES_SETTINGS.zoom.scaleExtent;
    
    if (initialScale !== null && initialScale < scaleExtent[0]) {
        scaleExtent = [initialScale * scaleExtent[0], scaleExtent[1]];
    }
    
    const zoom = d3
        .zoom()
        .scaleExtent(scaleExtent)
        .on("zoom", (event) => {
            contentGroup.attr("transform", event.transform);
        });
    svg.call(zoom);
    return zoom;
}
