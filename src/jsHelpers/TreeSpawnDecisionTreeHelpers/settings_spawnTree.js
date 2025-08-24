export function getVisualizationSettings() {
    const margin = { top: 90, right: 90, bottom: 90, left: 90 };
    const width = 800;
    const height = 800;
    return {
        margin,
        size: {
            width,
            height,
            innerWidth: width - margin.left - margin.right,
            innerHeight: height - margin.top - margin.bottom,
        },
        tree: {
            splitAngle: 0,
            minSplitWidth: 30,
            minSplitHeight: 25,
            levelHeightScale: 100,
            initialVisibleDepth: 2,
            get radianAngle() {
                return (this.splitAngle * Math.PI) / 180;
            },
        },
        node: {
            baseRadius: 12,
            minRadius: 4,
            maxRadius: 20,
            baseLinkAndNodeBorderStrokeWidth: 3,
            minLinkAndNodeBorderStrokeWidth: 1,
            maxLinkAndNodeBorderStrokeWidth: 8,
            maxZoom: 20,
        },
        visual: {
            // Rectangle dimensions for path nodes
            rectWidth: 150,
            rectHeight: 100,
            rectBorderRadius: 8,
            rectMargin: 100, // Base spacing between rectangles in path
            
            // Subtree-based spacing configuration
            subtreeSizeSpacingMultiplier: 10, // Additional pixels per node in subtree
            
            // Layout spacing
            verticalGap: 100, // Gap between path and subtrees
            
            // Stroke widths
            strokeWidth: {
                highlightLink: 4,
                pathHighlightMultiplier: 2,
            }
        }
    };
}