/**
 * @fileoverview Global configuration settings for tree visualizations.
 * Provides centralized configuration for layout dimensions, visual styling, zoom constraints, and tree-specific parameters.
 * @author Generated documentation
 * @module TreeSettings
 */

/**
 * @typedef {Object} MarginConfig
 * @property {number} top - Top margin in pixels
 * @property {number} right - Right margin in pixels
 * @property {number} bottom - Bottom margin in pixels
 * @property {number} left - Left margin in pixels
 */

/**
 * @typedef {Object} SizeConfig
 * @property {number} width - Total width including margins
 * @property {number} height - Total height including margins
 * @property {number} innerWidth - Width excluding margins
 * @property {number} innerHeight - Height excluding margins
 */

/**
 * @typedef {Object} TreeConfig
 * @property {number} minSplitWidth - Minimum horizontal spacing between splits
 * @property {number} minSplitHeight - Minimum vertical spacing between splits
 * @property {number} initialVisibleDepth - Initial depth for expand/collapse
 * @property {number} radianAngle - Angle for curved link calculations
 */

/**
 * @typedef {Object} NodeConfig
 * @property {number} baseRadius - Base radius for circular nodes
 * @property {number} minRadius - Minimum allowed radius
 * @property {number} maxRadius - Maximum allowed radius
 * @property {number} baseLinkAndNodeBorderStrokeWidth - Base stroke width
 * @property {number} minLinkAndNodeBorderStrokeWidth - Minimum stroke width
 * @property {number} maxLinkAndNodeBorderStrokeWidth - Maximum stroke width
 * @property {number} width - Width for rectangular nodes
 * @property {number} height - Height for rectangular nodes
 * @property {number} borderRadius - Border radius for rectangles
*/

/**
 * @typedef {Object} VisualConfig
 * @property {number} rectWidth - Width of path rectangles
 * @property {number} rectHeight - Height of path rectangles
 * @property {number} rectBorderRadius - Border radius for path rectangles
 * @property {number} rectMargin - Base spacing between rectangles
 * @property {number} subtreeSizeSpacingMultiplier - Pixels per subtree node
 * @property {number} verticalGap - Gap between path and subtrees
 * @property {Object} strokeWidth - Stroke width configurations
 * @property {number} strokeWidth.pathHighlightMultiplier - Multiplier for highlighted paths
 * @property {number} strokeWidth.extraBorderThickHighlightMult - Border enanchement for highlight
 */

/**
 * @typedef {Object} TreeKindIDs
 * @property {number} classic - ID for classic tree type
 * @property {number} spawn - ID for spawn tree type
 * @property {number} blocks - ID for blocks tree type
 */

/**
 * Standard margin configuration for all visualizations
 * @type {MarginConfig}
 */
const margin = { top: 90, right: 90, bottom: 90, left: 90 };

/**
 * Standard dimensions for visualization containers
 * @type {number}
 */
const width = 800;

/**
 * Standard dimensions for visualization containers
 * @type {number}
 */
const height = 800;

/**
 * Comprehensive configuration object for all tree visualization settings.
 * Centralizes all layout, visual, and behavioral parameters for consistent styling.
 * 
 * @type {Object}
 * @example
 * // Access node radius settings
 * const radius = TREES_SETTINGS.node.baseRadius;
 * 
 * @example
 * // Get tree kind identifier
 * const isClassic = treeKind === TREES_SETTINGS.treeKindID.classic;
 * 
 * @example
 * // Use visual spacing
 * const spacing = TREES_SETTINGS.visual.verticalGap;
 */
export const TREES_SETTINGS = {
    /**
     * Margin configuration for all visualizations
     * @type {MarginConfig}
     */
    margin,
    
    /**
     * Size configuration with calculated inner dimensions
     * @type {SizeConfig}
     */
    size: {
        width,
        height,
        innerWidth: width - margin.left - margin.right,
        innerHeight: height - margin.top - margin.bottom,
    },
    
    /**
     * Tree layout and spacing configuration
     * @type {TreeConfig}
     */
    tree: {
        minSplitWidth: 30,
        minSplitHeight: 25,
        initialVisibleDepth: 2,
        radianAngle: 0
    },
    
    /**
     * Node styling and sizing configuration
     * @type {NodeConfig}
     */
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
    
    /**
     * Zoom behavior constraints
     * @type {Object}
     * @property {Array<number>} scaleExtent - [min, max] zoom scale values
     */
    zoom: {
        scaleExtent: [0.5, 20],
    },
    
    /**
     * Layout spacing configuration
     * @type {Object}
     * @property {number} minSpacing - Minimum spacing between elements
     * @property {number} scaleFactorMultiplier - Multiplier for scaling calculations
     */
    layout: {
        minSpacing: 100,
        scaleFactorMultiplier: 1.5
    },
    
    /**
     * Visual styling configuration for advanced layouts
     * @type {VisualConfig}
     */
    visual: {
        rectWidth: 150,
        rectHeight: 100,
        rectBorderRadius: 8,
        rectMargin: 100,
        subtreeSizeSpacingMultiplier: 20,
        verticalGap: 100,
        strokeWidth: {
            pathHighlightMultiplier: 3,
            extraBorderThickHighlightMult: 2.5,
        },
    },
    
    /**
     * Tree type identifiers for conditional logic
     * @type {TreeKindIDs}
     */
    treeKindID: {
        classic: 1,
        spawn: 2,
        blocks: 3
    }
};

/**
 * Calculates node separation for D3 tree layouts.
 * Provides consistent spacing between adjacent nodes in tree visualizations.
 * 
 * @returns {number} Separation distance between nodes
 * @example
 * const separation = calculateSeparation();
 * // Returns: 60 (2 * minSplitWidth)
 * 
 * @example
 * // Used in D3 tree layout
 * const treeLayout = d3.tree()
 *   .separation((a, b) => calculateSeparation());
 * 
 * @see TREES_SETTINGS.tree.minSplitWidth
 */
export function calculateSeparation() {
    return TREES_SETTINGS.tree.minSplitWidth * 2;
}

/**
 * Calculates optimal font size for multi-line labels inside rectangles.
 * Ensures text fits within available space while maintaining readability.
 * 
 * @param {Array<string>} lines - Array of text lines to display
 * @returns {number} Optimal font size in pixels (between 8 and 20)
 * @example
 * const fontSize = calculateFontSize(['Short line', 'Much longer line text']);
 * // Returns: 14 (optimal size for content)
 * 
 * @example
 * const tinyFont = calculateFontSize(['Very very very long text line']);
 * // Returns: 8 (minimum font size)
 * 
 * @example
 * const bigFont = calculateFontSize(['A']);
 * // Returns: 20 (maximum font size)
 * 
 * @see TREES_SETTINGS.visual.rectWidth
 * @see TREES_SETTINGS.visual.rectHeight
 */
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
