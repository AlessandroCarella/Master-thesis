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
