/**
 * @fileoverview Tree layout metrics calculation and positioning algorithms.
 * Provides adaptive scaling, layout coordination for different tree types, and depth-aligned positioning for blocks trees.
 * @author Generated documentation
 * @module TreeMetrics
 */

import { getTreeState } from "./state.js";
import { createLinearPathLayout } from "../TreeSpawnDecisionTreeHelpers/subtrees_spawnTree.js";
import { TREES_SETTINGS, calculateSeparation } from "./settings.js";

/**
 * @typedef {Object} StandardMetrics
 * @property {number} totalNodes - Total number of nodes in tree
 * @property {number} maxDepth - Maximum depth of tree
 * @property {number} nodeRadius - Calculated node radius
 * @property {number} depthSpacing - Spacing between depth levels
 * @property {number} treeWidth - Total width of tree layout
 * @property {number} linkStrokeWidth - Width for link strokes
 * @property {number} nodeBorderStrokeWidth - Width for node borders
 */

/**
 * @typedef {Object} BlocksMetrics
 * @property {number} totalNodes - Total number of unique nodes
 * @property {number} maxDepth - Maximum depth of any path
 * @property {number} nodeScaleFactor - Scaling factor for node sizing
 * @property {number} nodeSpacing - Spacing between nodes
 * @property {number} requiredWidth - Minimum required width
 * @property {number} requiredHeight - Minimum required height
 * @property {number} linkStrokeWidth - Width for link strokes
 */

/**
 * @typedef {Object} DepthLayoutResult
 * @property {Object} positions - Node position mappings
 * @property {number} width - Layout width
 * @property {number} height - Layout height
 */

/**
 * Generates simplified node label using encoded features directly.
 * Works with encoded feature names for basic display without complex decoding.
 * 
 * @param {number} nodeId - Node ID to generate label for
 * @returns {string} Simple node label string
 * @example
 * const label = getNodeLabel(5);
 * // Returns: 'sepal_length_encoded ≤ 5.5' for split nodes
 * 
 * @example
 * const leafLabel = getNodeLabel(leafNodeId);
 * // Returns: 'class_0' for leaf nodes
 * 
 * @see getTreeState
 */
function getNodeLabel(nodeId) {
    const state = getTreeState(TREES_SETTINGS.treeKindID.blocks);
    const node = state.hierarchyRoot;
    
    if (!node) return `Node ${nodeId}`;
    
    function findNode(currentNode) {
        if (currentNode.data.node_id === nodeId) return currentNode.data;
        if (currentNode.children) {
            for (const child of currentNode.children) {
                const found = findNode(child);
                if (found) return found;
            }
        }
        return null;
    }
    
    const nodeData = findNode(node);
    if (!nodeData) return `Node ${nodeId}`;
    
    if (nodeData.is_leaf) {
        return nodeData.class_label;
    }
    
    const threshold = Number(nodeData.threshold) ?? 0;
    const thresholdStr = Number.isFinite(threshold) ? threshold.toFixed(1) : threshold;
    return `${nodeData.feature_name} ≤ ${thresholdStr}`;
}

/**
 * Calculates appropriate metrics based on tree type.
 * Delegates to specialized metric calculation functions for different tree visualization types.
 * 
 * @param {d3.HierarchyNode|Array} root - Tree root or paths data
 * @param {string} treeKind - Type of tree visualization
 * @returns {StandardMetrics|BlocksMetrics} Calculated metrics for the tree type
 * @example
 * const metrics = calculateMetrics(hierarchyRoot, TREES_SETTINGS.treeKindID.classic);
 * // Returns: { totalNodes: 15, maxDepth: 4, nodeRadius: 12, ... }
 * 
 * @example
 * const blocksMetrics = calculateMetrics(allPaths, TREES_SETTINGS.treeKindID.blocks);
 * // Returns: { totalNodes: 20, maxDepth: 5, nodeSpacing: 150, ... }
 * 
 * @see calculateStandardMetrics
 * @see calculateBlocksMetrics
 */
export function calculateMetrics(root, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return calculateBlocksMetrics(root);
    } else {
        return calculateStandardMetrics(root);
    }
}

/**
 * Calculates metrics for standard tree layouts (classic and spawn).
 * Uses logarithmic scaling for adaptive sizing based on tree complexity.
 * 
 * @param {d3.HierarchyNode} root - D3 hierarchy root node
 * @returns {StandardMetrics} Calculated metrics with adaptive scaling
 * @example
 * const metrics = calculateStandardMetrics(hierarchyRoot);
 * // Returns adaptive metrics based on tree size and complexity
 * 
 * @see calculateLogScale
 */
function calculateStandardMetrics(root) {
    const levelCounts = {};
    root.descendants().forEach((node) => {
        levelCounts[node.depth] = (levelCounts[node.depth] || 0) + 1;
    });
    const maxDepth = Math.max(...root.descendants().map((d) => d.depth));
    const totalNodes = root.descendants().length;

    /**
     * Calculates logarithmic scaling for adaptive sizing.
     * 
     * @param {number} totalNodes - Total node count
     * @param {number} baseValue - Base value to scale
     * @param {number} minValue - Minimum allowed value
     * @param {number} maxValue - Maximum allowed value
     * @returns {number} Scaled value within bounds
     * @private
     */
    function calculateLogScale(totalNodes, baseValue, minValue, maxValue) {
        let scale = Math.sqrt(totalNodes / 30);
        return Math.min(maxValue, Math.max(minValue, baseValue * scale));
    }

    return {
        totalNodes,
        maxDepth,
        get nodeRadius() {
            return calculateLogScale(
                this.totalNodes,
                TREES_SETTINGS.node.baseRadius,
                TREES_SETTINGS.node.minRadius,
                TREES_SETTINGS.node.maxRadius
            );
        },
        get depthSpacing() {
            return TREES_SETTINGS.size.innerHeight / (maxDepth + 1);
        },
        get treeWidth() {
            return this.depthSpacing * (maxDepth + 1);
        },
        get linkStrokeWidth() {
            return calculateLogScale(
                this.totalNodes,
                TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth,
                TREES_SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                TREES_SETTINGS.node.maxLinkAndNodeBorderStrokeWidth
            );
        },
        get nodeBorderStrokeWidth() {
            return this.linkStrokeWidth;
        },
    };
}

/**
 * Calculates metrics for blocks tree layouts.
 * Uses path-based analysis for rectangular node positioning and spacing.
 * 
 * @param {Array<Array<number>>} allPaths - All root-to-leaf paths in tree
 * @returns {BlocksMetrics} Calculated metrics for blocks layout
 * @example
 * const metrics = calculateBlocksMetrics([[0,1,3], [0,1,4], [0,2,5]]);
 * // Returns metrics optimized for rectangular node layout
 * 
 * @see TREES_SETTINGS.layout
 */
function calculateBlocksMetrics(allPaths) {
    const allNodes = new Set();
    allPaths.forEach((path) => path.forEach((id) => allNodes.add(id)));
    const totalNodes = allNodes.size;

    const nodeScaleFactor = Math.max(1, Math.sqrt(totalNodes / 100));
    const maxDepth = Math.max(...allPaths.map((p) => p.length - 1));

    return {
        totalNodes,
        maxDepth,
        nodeScaleFactor,
        get nodeSpacing() {
            return TREES_SETTINGS.layout.minSpacing * this.nodeScaleFactor;
        },
        get requiredWidth() {
            return (this.maxDepth + 1) * this.nodeSpacing * 2;
        },
        get requiredHeight() {
            return allPaths.length * this.nodeSpacing * TREES_SETTINGS.layout.scaleFactorMultiplier;
        },
        get linkStrokeWidth() {
            return Math.max(
                TREES_SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                Math.min(
                    TREES_SETTINGS.node.maxLinkAndNodeBorderStrokeWidth,
                    TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth * Math.sqrt(this.totalNodes / 30)
                )
            );
        },
        get nodeStrokeWidth() {
            return this.linkStrokeWidth; // Use same logic as links for consistency
        },
    };
}

/**
 * Creates appropriate tree layout function based on tree type.
 * Returns layout function configured for the specific tree visualization type.
 * 
 * @param {StandardMetrics|BlocksMetrics} metrics - Layout metrics
 * @param {d3.HierarchyNode} root - Tree root node
 * @param {string} treeKind - Type of tree visualization
 * @returns {Function} Layout function for positioning nodes
 * @example
 * const layout = createTreeLayout(metrics, hierarchyRoot, 'classic');
 * const positionedTree = layout(root);
 * // Returns tree with calculated node positions
 * 
 * @example
 * // Linear layout for spawn trees
 * const spawnLayout = createTreeLayout(metrics, root, 'spawn');
 * // Returns function that applies linear path layout
 * 
 * @see createLinearPathLayout
 * @see d3.tree
 */
export function createTreeLayout(metrics, root, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        const state = getTreeState(treeKind);
        let instancePath = state.instancePath;

        return function(rootNode) {
            return createLinearPathLayout(rootNode, metrics, instancePath);
        };
    } 

    const horizontalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitWidth;
    const verticalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitHeight;

    return d3.tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) => calculateSeparation());
}

/**
 * Calculates initial zoom transform for tree visualization.
 * Determines optimal scale and translation to fit tree within viewport bounds.
 * 
 * @param {d3.HierarchyNode} treeData - Tree data with positioned nodes
 * @returns {d3.ZoomTransform} D3 zoom transform object with scale and translation
 * @example
 * const transform = calculateInitialTransform(positionedTree);
 * svg.call(zoom.transform, transform);
 * // Applies optimal initial zoom to fit tree in view
 * 
 * @see d3.zoomIdentity
 * @see TREES_SETTINGS.size
 * @see TREES_SETTINGS.margin
 */
export function calculateInitialTransform(treeData) {
    const allNodes = treeData.descendants();
    const [minX, maxX] = d3.extent(allNodes, (d) => d.x);
    const [minY, maxY] = d3.extent(allNodes, (d) => d.y);

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = TREES_SETTINGS.size.innerWidth / treeWidth;
    const scaleY = TREES_SETTINGS.size.innerHeight / treeHeight;
    const k = Math.min(scaleX, scaleY);

    const translateX =
        (TREES_SETTINGS.size.innerWidth - treeWidth * k) / 2 -
        minX * k +
        TREES_SETTINGS.margin.left;
    const translateY =
        (TREES_SETTINGS.size.innerHeight - treeHeight * k) / 2 -
        minY * k +
        TREES_SETTINGS.margin.top;

    const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(k);
    transform.k = k;
    return transform;
}

/**
 * Calculates stroke width based on sample proportions.
 * Scales link thickness based on the number of samples flowing through each link.
 * 
 * @param {number} weighted_n_samples - Number of samples at target node
 * @param {number} totalSamples - Total samples in dataset
 * @param {number} linkStrokeWidth - Base link stroke width
 * @param {string} treeKind - Type of tree visualization
 * @returns {number} Calculated stroke width for the link
 * @example
 * const width = getStrokeWidth(50, 150, 3, 'classic');
 * // Returns: 5 (scaled based on sample proportion)
 * 
 * @example
 * const narrowWidth = getStrokeWidth(10, 150, 3, 'blocks');
 * // Returns: 2 (thinner for fewer samples)
 * 
 * @see getTreeState
 */
export function getStrokeWidth(weighted_n_samples, totalSamples, linkStrokeWidth, treeKind) {
    const state = getTreeState(treeKind);
    
    if (!totalSamples && state.treeData && state.treeData.length > 0) {
        totalSamples = state.treeData[0].n_samples;
    }
    
    const ratio = weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * linkStrokeWidth;

    return strokeWidth;
}

/**
 * Calculates tree metrics specifically for blocks tree layout.
 * Wrapper function that ensures blocks-specific metric calculation.
 * 
 * @param {Array<Array<number>>} allPaths - All root-to-leaf paths
 * @param {string} treeKind - Type of tree (should be blocks)
 * @returns {BlocksMetrics|null} Calculated blocks metrics or null for other types
 * @example
 * const metrics = calculateTreeMetrics(allPaths, TREES_SETTINGS.treeKindID.blocks);
 * // Returns blocks-specific metrics
 * 
 * @see calculateBlocksMetrics
 */
export function calculateTreeMetrics(allPaths, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return calculateBlocksMetrics(allPaths);
    } else {
        console.warn("calculateTreeMetrics is blocks-specific, use calculateMetrics for other trees");
        return null;
    }
}

/**
 * Creates depth-aligned layout for blocks tree visualization.
 * Positions rectangular nodes in aligned columns with instance path at bottom.
 * 
 * @param {Array<Array<number>>} allPaths - All root-to-leaf paths in tree
 * @param {Array<number>} instancePath - Instance path for special positioning
 * @param {BlocksMetrics} metrics - Calculated blocks metrics
 * @param {string} treeKind - Type of tree (should be blocks)
 * @returns {DepthLayoutResult|null} Layout result with positions and dimensions
 * @example
 * const layout = depthAlignedLayout(allPaths, [0,1,3], metrics, 'blocks');
 * // Returns: { positions: {...}, width: 800, height: 600 }
 * 
 * @see getNodeLabel
 * @see findBranchPoint
 * @see arraysEqual
 */
export function depthAlignedLayout(allPaths, instancePath, metrics, treeKind) {
    if (treeKind !== TREES_SETTINGS.treeKindID.blocks) {
        console.warn("depthAlignedLayout is blocks-specific");
        return null;
    }

    const positions = {};

    const effectiveWidth = Math.max(TREES_SETTINGS.size.width, metrics.requiredWidth);
    const effectiveHeight = Math.max(TREES_SETTINGS.size.height, metrics.requiredHeight);

    const margin = {
        top: TREES_SETTINGS.margin.top * metrics.nodeScaleFactor,
        right: TREES_SETTINGS.margin.right * metrics.nodeScaleFactor,
        bottom: TREES_SETTINGS.margin.bottom * metrics.nodeScaleFactor,
        left: TREES_SETTINGS.margin.left * metrics.nodeScaleFactor,
    };

    const availableWidth = effectiveWidth - margin.left - margin.right;
    const availableHeight = effectiveHeight - margin.top - margin.bottom;

    const depthToX = {};
    for (let depth = 0; depth <= metrics.maxDepth; depth++) {
        depthToX[depth] =
            margin.left +
            (metrics.maxDepth === 0 ? 0 : depth * (availableWidth / metrics.maxDepth));
    }

    const bottomY = effectiveHeight - margin.bottom;
    instancePath.forEach((nodeId, depth) => {
        positions[nodeId] = {
            id: nodeId,
            x: depthToX[depth],
            y: bottomY,
            label: getNodeLabel(nodeId),
        };
    });

    const otherPaths = [];
    for (const p of allPaths)
        if (!arraysEqual(p, instancePath)) otherPaths.push(p);

    const sortedOtherPaths = otherPaths.sort(
        (a, b) =>
            findBranchPoint(a, instancePath) - findBranchPoint(b, instancePath)
    );
    const availableSpaceAbove = availableHeight - margin.bottom * 2;
    const pathSpacing = Math.max(
        metrics.nodeSpacing,
        availableSpaceAbove / Math.max(1, sortedOtherPaths.length)
    );

    sortedOtherPaths.forEach((path, idx) => {
        const y = margin.top + idx * pathSpacing;
        path.forEach((nodeId, depth) => {
            if (!positions[nodeId]) {
                positions[nodeId] = {
                    id: nodeId,
                    x: depthToX[depth],
                    y,
                    label: getNodeLabel(nodeId),
                };
            }
        });
    });

    return { positions, width: effectiveWidth, height: effectiveHeight };
}

/**
 * Checks if two arrays are equal.
 * Helper function for path comparison in layout algorithms.
 * 
 * @param {Array} a - First array to compare
 * @param {Array} b - Second array to compare
 * @returns {boolean} True if arrays are equal
 * @example
 * const equal = arraysEqual([1,2,3], [1,2,3]);
 * // Returns: true
 * 
 * @example
 * const notEqual = arraysEqual([1,2], [1,2,3]);
 * // Returns: false
 * @private
 */
function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Finds the branch point between two paths.
 * Determines how far two paths share common nodes before diverging.
 * 
 * @param {Array<number>} path - Path to compare against instance path
 * @param {Array<number>} instancePath - Reference instance path
 * @returns {number} Index of last common node
 * @example
 * const branchPoint = findBranchPoint([0,1,4], [0,1,3]);
 * // Returns: 1 (paths diverge after node 1)
 * 
 * @example
 * const earlyBranch = findBranchPoint([0,2,5], [0,1,3]);
 * // Returns: 0 (paths diverge after root)
 * @private
 */
function findBranchPoint(path, instancePath) {
    if (!path || !instancePath) return 0;
    
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) {
            branchPoint = i;
        } else {
            break;
        }
    }
    
    return branchPoint;
}
