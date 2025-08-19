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
            initialVisibleDepth: 2, // Show subtree nodes up to this depth initially
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
            rectMargin: 100, // Base spacing between rectangles in path (minimum value)
            
            // Subtree-based spacing configuration
            subtreeSizeSpacingMultiplier: 10, // Additional pixels per node in subtree
            
            // Layout spacing
            verticalGap: 100, // Gap between path and subtrees
            
            // Color palette for class labels
            colorPalette: [
                "#8dd3c7",
                "#ffffb3",
                "#bebada",
                "#fb8072",
                "#80b1d3",
                "#fdb462",
                "#b3de69",
                "#fccde5",
                "#d9d9d9",
                "#bc80bd"
            ],
            
            // Color scheme for UI elements
            colors: {
                // Node colors
                nodeStroke: '#333',
                nodeDefault: '#e0e0e0', // Default for non-leaf nodes
                nodeDefaultLeaf: '#cccccc', // Default for leaf nodes without class
                
                // Highlight colors
                highlight: '#ff6b6b',
                pathHighlight: '#ff4444',
                pathHighlightStroke: '#cc0000',
                
                // Link colors
                linkStroke: '#999',
                highlightStroke: '#ff4444'
            },
            
            // Opacity settings
            opacity: {
                hover: 1,
                normal: 1,
                pathHighlight: 1
            },
            
            // Stroke widths
            strokeWidth: {
                highlightLink: 4,
                pathHighlightMultiplier: 1.5 // Multiplier for path node border width
            }
        }
    };
}