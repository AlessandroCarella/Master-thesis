export function setupZoom(svg, g, SETTINGS) {
    const zoom = d3
        .zoom()
        .scaleExtent(SETTINGS.zoom.scaleExtent)
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
    
    return zoom;
}