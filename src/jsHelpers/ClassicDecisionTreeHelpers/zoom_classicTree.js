export function initializeZoom(svg, contentGroup, SETTINGS, metrics, minZoom) {
    const zoom = d3
        .zoom()
        .scaleExtent([minZoom, SETTINGS.node.maxZoom])
        .on("zoom", function (event) {
            contentGroup.attr("transform", event.transform);
        });

    svg.call(zoom);
    return zoom;
}
