import { colorScheme } from "../visualizationConnector.js";

// Main settings function similar to other tree implementations
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
            initialVisibleDepth: 5, // Show subtree nodes up to this depth initially
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
            
            // Use global color scheme to match other trees
            colors: {
                // Node colors - use global color scheme
                nodeStroke: colorScheme.ui.nodeStroke,
                nodeDefault: colorScheme.ui.default, // Default for non-leaf nodes
                nodeDefaultLeaf: colorScheme.ui.default, // Default for leaf nodes without class
                
                // Highlight colors - use global color scheme
                highlight: colorScheme.ui.highlight,
                pathHighlight: colorScheme.ui.instancePathHighlight, // Match blocks tree
                pathHighlightStroke: colorScheme.ui.instancePathHighlight, // Match blocks tree
                
                // Link colors - use global color scheme
                linkStroke: colorScheme.ui.linkStroke,
                highlightStroke: colorScheme.ui.instancePathHighlight // Match blocks tree
            },
            
            // Opacity settings - use global opacity settings
            opacity: {
                hover: colorScheme.opacity.default,
                normal: colorScheme.opacity.default,
            },
            
            // Stroke widths
            strokeWidth: {
                highlightLink: 4,
                pathHighlightMultiplier: 2 // Match the multiplier used in blocks tree
            }
        }
    };
}