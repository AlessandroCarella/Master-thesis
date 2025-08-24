export function getVisualizationSettings() {
    const margin = { top: 90, right: 90, bottom: 90, left: 90 };
    const width = 800;
    const height = 800;
    const rectWidth = 150;
    const rectHeight = 100;
    
    return {
        margin,
        size: {
            width,
            height,
            innerWidth: width - margin.left - margin.right,
            innerHeight: height - margin.top - margin.bottom,
        },
        layout: {
            minSpacing: 100,
            scaleFactor: {
                base: 100,
                multiplier: 1.5
            }
        },
        node: {
            width: rectWidth,
            height: rectHeight,
            borderRadius: 4,
            baseLinkAndNodeBorderStrokeWidth: 3,
            minLinkAndNodeBorderStrokeWidth: 1,
            maxLinkAndNodeBorderStrokeWidth: 8,
        },
        zoom: {
            scaleExtent: [0.1, 20],
        },
        colors: {
            splitNode: "#cccccc"
        }
    };
}