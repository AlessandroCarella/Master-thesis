/**
 * @fileoverview Zoom functionality for scatter plot visualizations with pan and scale constraints
 * @module zoom
 * @author Generated documentation
 */

/**
 * Creates and applies zoom behavior to an SVG element with constrained pan and zoom limits
 * @description Sets up D3 zoom behavior with scale and translation constraints for controlled viewport navigation
 * @param {d3.Selection} svg - D3 selection of the SVG element to apply zoom behavior to
 * @param {d3.Selection} g - D3 selection of the content group element that will be transformed
 * @param {Object} margin - Margin configuration object
 * @param {number} margin.left - Left margin in pixels
 * @param {number} margin.top - Top margin in pixels
 * @param {number} margin.right - Right margin in pixels
 * @param {number} margin.bottom - Bottom margin in pixels
 * @param {number} width - Total width of the visualization area in pixels
 * @param {number} height - Total height of the visualization area in pixels
 * @returns {void}
 * @example
 * createZoom(svgElement, contentGroup, 
 *   { left: 50, top: 50, right: 50, bottom: 50 }, 
 *   800, 600
 * );
 */
export function createZoom(svg, g, margin, width, height) {
    const initialZoom = d3.zoomIdentity;
    const zoom = d3
        .zoom()
        .scaleExtent([initialZoom.k, 5])
        .translateExtent([
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom],
        ])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
}
