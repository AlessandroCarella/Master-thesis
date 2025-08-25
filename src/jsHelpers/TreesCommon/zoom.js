export function initializeZoom(
    svg,
    contentGroup,
    SETTINGS
) {
    const zoom = d3
        .zoom()
        .scaleExtent(SETTINGS.zoom.scaleExtent)
        .on("zoom", (event) => {
            contentGroup.attr("transform", event.transform);
        });
    svg.call(zoom);
    return zoom;
}
