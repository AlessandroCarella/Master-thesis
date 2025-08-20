import { ZOOM_CONFIG } from "./settings.js";

export function setupZoom(svg, g) {
    const zoom = d3
        .zoom()
        .scaleExtent(ZOOM_CONFIG.scaleExtent)
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
    
    return zoom;
}

export function resetZoom(svg, zoom) {
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
    );
}

export function zoomToFit(svg, zoom, bounds, width, height) {
    const [[x0, y0], [x1, y1]] = bounds;
    const scale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const translate = [width / 2 - scale * (x0 + x1) / 2, height / 2 - scale * (y0 + y1) / 2];
    
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
}