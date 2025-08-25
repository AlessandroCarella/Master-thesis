const margin = { top: 90, right: 90, bottom: 90, left: 90 };
const width = 800;
const height = 800;

export const TREES_SETTINGS = {
    margin,
    size: {
        width,
        height,
        innerWidth: width - margin.left - margin.right,
        innerHeight: height - margin.top - margin.bottom,
    },
    tree: {
        minSplitWidth: 30,
        minSplitHeight: 25,
        initialVisibleDepth: 2,
        radianAngle:0
    },
    node: {
        baseRadius: 12,
        minRadius: 4,
        maxRadius: 20,
        baseLinkAndNodeBorderStrokeWidth: 3,
        minLinkAndNodeBorderStrokeWidth: 1,
        maxLinkAndNodeBorderStrokeWidth: 8,
        width: 150,
        height: 100,
        borderRadius: 4,
    },
    zoom: {
        scaleExtent: [0.5, 20],
    },
    layout: {
        minSpacing: 100,
        scaleFactorMultiplier: 1.5
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
            pathHighlightMultiplier: 2,
        },
    },
};

export function calculateSeparation() {
    return TREES_SETTINGS.tree.minSplitWidth * 2;
}

// Calculate optimal font size for multi-line labels inside a rectangle
export function calculateFontSize(lines) {
    const padding = 10;
    const lineHeight = 1.2;
    const charWidthRatio = 0.6;

    const availableWidth = TREES_SETTINGS.visual.rectWidth - padding * 2;
    const availableHeight = TREES_SETTINGS.visual.rectHeight - padding * 2;

    const maxTextLength = Math.max(
        ...lines.map((line) => (line ?? "").toString().length)
    );
    
    const fontSizeBasedOnWidth = availableWidth / Math.max(1, maxTextLength * charWidthRatio);
    const fontSizeBasedOnHeight = availableHeight / Math.max(1, lines.length * lineHeight);

    let fontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);
    fontSize = Math.max(8, Math.min(20, fontSize));
    
    return fontSize;
}