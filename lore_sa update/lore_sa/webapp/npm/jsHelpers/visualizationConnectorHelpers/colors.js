/**
 * @fileoverview Color management system for consistent visualization styling.
 * Provides centralized color schemes, API integration for class colors, and global color state management.
 * @author Generated documentation
 * @module Colors
 */

import { fetchClassColors } from "../API.js";

/**
 * @typedef {Object} ColorScheme
 * @property {Array<string>} classColors - Array of colors for class labels
 * @property {Object} ui - UI element colors
 * @property {Object} opacity - Opacity settings for different elements
 * @property {Object} stroke - Stroke width settings
 */

/**
 * @typedef {Object} UIColors
 * @property {string} highlight - Primary highlight color
 * @property {string} default - Default element color
 * @property {string} nodeStroke - Node border color
 * @property {string} linkStroke - Link/edge color
 * @property {string} background - Background color
 * @property {string} instancePathHighlight - Instance path highlight color
 * @property {string} falseLink - Color for false decision branches
 * @property {string} trueLink - Color for true decision branches
 */

/**
 * Comprehensive color scheme configuration for all visualization components.
 * Provides consistent styling across scatter plots, trees, and UI elements.
 * 
 * @type {ColorScheme}
 * @example
 * // Access highlight color
 * const highlightColor = colorScheme.ui.highlight;
 * 
 * // Set point opacity
 * element.style('opacity', colorScheme.opacity.datasetPoint);
 */
export const colorScheme = {
    /**
     * Predefined colors for class labels (populated from API)
     * @type {Array<string>}
     */
    classColors: [],
    
    /**
     * UI element colors for consistent interface styling
     * @type {UIColors}
     */
    ui: {
        highlight: "rebeccapurple",
        default: "#cccccc",
        nodeStroke: "#666666",
        linkStroke: "#999999",
        background: "#ffffff",
        instancePathHighlight: "#FFFF00",
        falseLink: "#A50026",
        trueLink: "#006837"
    },
    
    /**
     * Opacity settings for different visualization states
     * @type {Object}
     */
    opacity: {
        default: 1,
        neighPoint: 1,
        datasetPoint: 0.3,
        originalInstancePath: 0.5,
        hidden: 0,
        voronoi: 0.2,
    },
    
    /**
     * Stroke width settings for visual elements
     * @type {Object}
     */
    stroke: {
        voronoi: 0.5,
        points2DScatterPlot: 1,
    }
};

/**
 * Initializes color scheme by fetching class colors from API.
 * Updates the global color scheme with method-specific colors for consistency.
 * 
 * @async
 * @param {string} [method='umap'] - Dimensionality reduction method for color consistency
 * @throws {Error} When color fetching fails (continues with fallback)
 * @example
 * await initializeColors('pca');
 * // Colors fetched and applied to global scheme
 * 
 * @example
 * await initializeColors(); 
 * // Uses default 'umap' method
 * 
 * @see fetchClassColors
 */
export async function initializeColors(method = 'umap') {
    try {
        const colors = await fetchClassColors(method);
        colorScheme.classColors = colors;
    } catch (error) {
        console.error("Failed to fetch class colors:", error);
        colorScheme.classColors = [];
    }
}

/**
 * Generates consistent color mapping for class labels.
 * Creates deterministic color assignments by sorting classes and mapping to color array.
 * 
 * @param {Array<number|string>} classes - Array of class labels to map
 * @returns {Object<string|number, string>} Object mapping class labels to color values
 * @throws {Error} When classes array is invalid
 * @example
 * const colorMap = generateColorMap([0, 1, 2]);
 * // Returns: { 0: '#1f77b4', 1: '#ff7f0e', 2: '#2ca02c' }
 * 
 * @example
 * const colorMap = generateColorMap(['setosa', 'versicolor', 'virginica']);
 * // Returns: { 'virginica': '#1f77b4', 'versicolor': '#ff7f0e', 'setosa': '#2ca02c' }
 * 
 * @see colorScheme.classColors
 */
export function generateColorMap(classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
        console.error("Invalid classes array provided to generateColorMap");
        return {};
    }

    const sortedClasses = [...new Set(classes)].sort((a, b) => b - a);
    const colorMap = {};

    sortedClasses.forEach((classLabel, index) => {
        colorMap[classLabel] = colorScheme.classColors[index];
    });

    return colorMap;
}

/**
 * Gets appropriate color for a tree node based on its type and class.
 * Returns class-specific colors for leaf nodes and default color for decision nodes.
 * 
 * @param {Object} node - Tree node object
 * @param {Object} node.data - Node data containing type and class information
 * @param {boolean} node.data.is_leaf - Whether node is a leaf
 * @param {number|string} [node.data.class_label] - Class label for leaf nodes
 * @param {Object<string|number, string>} colorMap - Mapping of class labels to colors
 * @returns {string} Color value for the node
 * @example
 * const leafNode = { data: { is_leaf: true, class_label: 1 } };
 * const color = getNodeColor(leafNode, { 1: '#ff7f0e' });
 * // Returns: '#ff7f0e'
 * 
 * @example
 * const splitNode = { data: { is_leaf: false, feature_name: 'sepal_length' } };
 * const color = getNodeColor(splitNode, colorMap);
 * // Returns: default color for decision nodes
 * 
 * @see colorScheme.ui.default
 */
export function getNodeColor(node, colorMap) {
    if (!node) return colorScheme.ui.default;

    if (node.data && node.data.is_leaf) {
        return colorMap[node.data.class_label] || colorScheme.ui.default;
    }
    
    return colorScheme.ui.default;
}

/**
 * Global color map state for cross-visualization consistency.
 * Maintains current color assignments for synchronized visualization updates.
 * 
 * @type {Object<string|number, string>|null}
 * @private
 */
let globalColorMap = null;

/**
 * Sets the global color map for cross-visualization consistency.
 * Updates the shared color state used by all visualization components.
 * 
 * @param {Array<number|string>} classes - Array of class labels
 * @returns {Object<string|number, string>|null} Generated color map or null
 * @example
 * const colorMap = setGlobalColorMap([0, 1, 2]);
 * // Sets global color map and returns it
 * 
 * @example
 * setGlobalColorMap([]);
 * // Clears global color map (sets to null)
 * 
 * @see generateColorMap
 */
export function setGlobalColorMap(classes) {
    if (Array.isArray(classes) && classes.length > 0) {
        globalColorMap = generateColorMap(classes);
    } else {
        globalColorMap = null;
    }
    return globalColorMap;
}

/**
 * Gets the current global color map.
 * Provides access to shared color state across all visualizations.
 * 
 * @returns {Object<string|number, string>|null} Current global color map or null
 * @example
 * const currentColors = getGlobalColorMap();
 * if (currentColors) {
 *   const classColor = currentColors[classLabel];
 * }
 * 
 * @example
 * // Used in visualization rendering
 * points.style('fill', (d, i) => {
 *   const colorMap = getGlobalColorMap();
 *   return colorMap[targets[i]] || '#cccccc';
 * });
 */
export function getGlobalColorMap() {
    return globalColorMap;
}
