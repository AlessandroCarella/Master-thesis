/**
 * @fileoverview Hierarchical subtree management for TreeSpawn visualization.
 * Provides expand/collapse functionality, linear path layout, and adaptive spacing based on subtree complexity.
 * @author Generated documentation
 * @module SubtreesSpawn
 */

import { TREES_SETTINGS, calculateSeparation } from "../TreesCommon/settings.js";

/**
 * @typedef {Object} TreeNode
 * @property {Object} data - Node data object
 * @property {number} data.node_id - Unique node identifier
 * @property {boolean} data.is_leaf - Whether node is a leaf
 * @property {Array<TreeNode>} [children] - Child nodes array
 * @property {boolean} [hasHiddenChildren] - Whether node has collapsed children
 * @property {boolean} [isExpanded] - Whether node subtree is expanded
 * @property {boolean} [isHidden] - Whether node is currently hidden
 * @property {boolean} [isInPath] - Whether node is in instance path
 * @property {number} [x] - X coordinate position
 * @property {number} [y] - Y coordinate position
 */

/**
 * @typedef {Object} SubtreeLayoutResult
 * @property {Object} positions - Node position mappings
 * @property {number} width - Required layout width
 * @property {number} height - Required layout height
 */

/**
 * Creates D3 hierarchy from a tree node and its descendants.
 * Recursively builds hierarchy structure compatible with D3 tree layout algorithms.
 * 
 * @param {TreeNode} node - Root node for subtree hierarchy
 * @returns {d3.HierarchyNode|null} D3 hierarchy node or null if invalid input
 * @example
 * const hierarchy = createSubtreeHierarchy(subtreeRoot);
 * // Returns D3 hierarchy suitable for tree layout
 * 
 * @see d3.hierarchy
 */
function createSubtreeHierarchy(node) {
    if (!node || !node.data) return null;
    
    const createHierarchyNode = (treeNode) => {
        const hierarchyData = {
            ...treeNode.data,
            children: treeNode.children ? treeNode.children.map(createHierarchyNode) : []
        };
        return hierarchyData;
    };
    
    return d3.hierarchy(createHierarchyNode(node));
}

/**
 * Creates D3 tree layout with consistent settings for subtree positioning.
 * Uses adaptive spacing based on subtree size for optimal space utilization.
 * 
 * @param {d3.HierarchyNode} subtreeRoot - D3 hierarchy root for layout
 * @returns {Function|null} D3 tree layout function or null if invalid root
 * @example
 * const layout = createSubtreeLayout(hierarchyRoot);
 * const positionedTree = layout(hierarchyRoot);
 * // Returns tree with calculated positions
 * 
 * @see d3.tree
 * @see calculateSeparation
 */
function createSubtreeLayout(subtreeRoot) {
    if (!subtreeRoot) return null;
    
    const subtreeNodes = subtreeRoot.descendants();
    const horizontalSpacing = subtreeNodes.length * TREES_SETTINGS.tree.minSplitWidth;
    const verticalSpacing = subtreeNodes.length * TREES_SETTINGS.tree.minSplitHeight;

    return d3.tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) => calculateSeparation());
}

/**
 * Sets up node expansion states with configurable initial depth.
 * Manages visibility and expansion flags for hierarchical subtree display.
 * 
 * @param {TreeNode} node - Node to configure expansion states for
 * @param {boolean} [isSubtreeRoot=false] - Whether node is subtree root
 * @param {number} [currentDepth=0] - Current depth in hierarchy
 * @example
 * setupNodeExpansionStates(subtreeRoot, true, 0);
 * // Configures expansion states for entire subtree
 * 
 * @example
 * setupNodeExpansionStates(childNode, false, 2);
 * // Configures single node at depth 2
 * 
 * @see setupNodeExpansionStatesRecursive
 */
function setupNodeExpansionStates(node, isSubtreeRoot = false, currentDepth = 0) {
    const maxInitialDepth = TREES_SETTINGS.tree.initialVisibleDepth;
    
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        if (currentDepth >= maxInitialDepth) {
            node.hasHiddenChildren = true;
            node.isExpanded = false;
        } else {
            node.hasHiddenChildren = false;
            node.isExpanded = true;
        }
    } else {
        node.hasHiddenChildren = false;
        node.isExpanded = false;
    }
    
    if (isSubtreeRoot) {
        node.isHidden = false;
        if (node.children) {
            node.children.forEach(child => {
                setupNodeExpansionStatesRecursive(child, currentDepth + 1, maxInitialDepth);
            });
        }
    }
}

/**
 * Recursively sets up expansion states for all nodes in subtree.
 * Helper function for comprehensive subtree state management.
 * 
 * @param {TreeNode} node - Current node to process
 * @param {number} currentDepth - Current depth level
 * @param {number} maxInitialDepth - Maximum initial visible depth
 * @private
 * @example
 * // Internal usage only
 * setupNodeExpansionStatesRecursive(childNode, 1, 3);
 */
function setupNodeExpansionStatesRecursive(node, currentDepth, maxInitialDepth) {
    node.isHidden = currentDepth > maxInitialDepth;
    
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        if (currentDepth >= maxInitialDepth) {
            node.hasHiddenChildren = true;
            node.isExpanded = false;
        } else {
            node.hasHiddenChildren = false;
            node.isExpanded = true;
        }
    } else {
        node.hasHiddenChildren = false;
        node.isExpanded = false;
    }
    
    if (node.children) {
        node.children.forEach(child => {
            setupNodeExpansionStatesRecursive(child, currentDepth + 1, maxInitialDepth);
        });
    }
}

/**
 * Recursively sets visibility state for all descendant nodes.
 * Used for showing/hiding entire subtrees during expand/collapse operations.
 * 
 * @param {TreeNode} node - Root node of subtree to modify
 * @param {boolean} hidden - Whether descendants should be hidden
 * @example
 * setDescendantsHidden(subtreeRoot, true);
 * // Hides entire subtree
 * 
 * @example
 * setDescendantsHidden(expandedNode, false);
 * // Shows entire subtree
 */
function setDescendantsHidden(node, hidden) {
    node.isHidden = hidden;
    if (node.children) {
        node.children.forEach(child => setDescendantsHidden(child, hidden));
    }
}

/**
 * Calculates total number of nodes in a subtree recursively.
 * Used for adaptive spacing calculations based on subtree complexity.
 * 
 * @param {TreeNode} node - Root node to count from
 * @returns {number} Total node count in subtree
 * @example
 * const size = calculateSubtreeSize(subtreeRoot);
 * // Returns: 15 (total nodes in subtree)
 * 
 * @example
 * const leafSize = calculateSubtreeSize(leafNode);
 * // Returns: 1 (just the leaf node)
 */
function calculateSubtreeSize(node) {
    if (!node) return 0;
    
    let count = 1;
    
    if (node.children) {
        node.children.forEach(child => {
            count += calculateSubtreeSize(child);
        });
    }
    
    return count;
}

/**
 * Calculates subtree sizes for all path nodes to determine spacing requirements.
 * Analyzes off-path subtrees to optimize layout spacing between path nodes.
 * 
 * @param {Array<TreeNode>} pathNodes - Array of nodes in instance path
 * @param {Array<number>} instancePath - Array of node IDs in path
 * @returns {Array<number>} Array of subtree sizes for each path node
 * @example
 * const sizes = calculatePathNodeSubtreeSizes(pathNodes, [0, 1, 3, 7]);
 * // Returns: [25, 8, 0, 0] (off-path subtree sizes for each path node)
 * 
 * @see calculateSubtreeSize
 */
function calculatePathNodeSubtreeSizes(pathNodes, instancePath) {
    return pathNodes.map(pathNode => {
        if (!pathNode.children) return 0;
        
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        let totalSubtreeSize = 0;
        offPathChildren.forEach(subtreeRoot => {
            totalSubtreeSize += calculateSubtreeSize(subtreeRoot);
        });
        
        return totalSubtreeSize;
    });
}

/**
 * Positions subtree using D3 tree layout with hierarchical expand/collapse support.
 * Creates properly positioned subtree with expansion state management.
 * 
 * @param {TreeNode} subtreeRoot - Root node of subtree to position
 * @param {number} anchorX - X coordinate anchor point
 * @param {number} anchorY - Y coordinate anchor point  
 * @param {boolean} isAbove - Whether subtree should be positioned above anchor
 * @example
 * positionSubtreeWithD3Layout(subtreeRoot, 300, 200, true);
 * // Positions subtree above the anchor point
 * 
 * @example
 * positionSubtreeWithD3Layout(offPathSubtree, 150, 100, false);
 * // Positions subtree below the anchor point
 * 
 * @see createSubtreeHierarchy
 * @see createSubtreeLayout
 * @see setupNodeExpansionStates
 */
function positionSubtreeWithD3Layout(subtreeRoot, anchorX, anchorY, isAbove) {
    if (!subtreeRoot) return;
    
    const hierarchy = createSubtreeHierarchy(subtreeRoot);
    if (!hierarchy) return;
    
    const treeLayout = createSubtreeLayout(hierarchy);
    if (!treeLayout) return;

    const layoutResult = treeLayout(hierarchy);
    
    const nodes = layoutResult.descendants();
    const [minY] = d3.extent(nodes, d => d.y);
    
    const rootHierarchyNode = layoutResult;
    
    const hierarchyToOriginalMap = new Map();
    
    function mapNodes(hierarchyNode, originalNode) {
        hierarchyToOriginalMap.set(hierarchyNode, originalNode);
        if (hierarchyNode.children && originalNode.children) {
            hierarchyNode.children.forEach((child, index) => {
                if (originalNode.children[index]) {
                    mapNodes(child, originalNode.children[index]);
                }
            });
        }
    }
    mapNodes(hierarchy, subtreeRoot);
    
    nodes.forEach(hierarchyNode => {
        const originalNode = hierarchyToOriginalMap.get(hierarchyNode);
        if (originalNode) {
            if (hierarchyNode === rootHierarchyNode) {
                originalNode.x = anchorX;
            } else {
                const rootLayoutX = rootHierarchyNode.x;
                const offsetFromRoot = hierarchyNode.x - rootLayoutX;
                originalNode.x = anchorX + offsetFromRoot;
            }
            
            if (isAbove) {
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY - TREES_SETTINGS.visual.verticalGap - distanceFromRoot;
            } else {
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY + TREES_SETTINGS.visual.verticalGap + distanceFromRoot;
            }
            
            originalNode.isInPath = false;
            originalNode.subtreeRoot = subtreeRoot;
        }
    });
    
    setupNodeExpansionStates(subtreeRoot, true);
}

/**
 * Calculates optimal spacing for path nodes based on subtree complexity.
 * Uses adaptive algorithm that considers subtree sizes for dynamic spacing.
 * 
 * @param {Array<number>} subtreeSizes - Array of subtree sizes for each path node
 * @param {number} totalWidth - Total available width for layout
 * @param {number} pathNodesCount - Number of nodes in path
 * @returns {Array<number>} Array of X positions for path nodes
 * @example
 * const positions = calculatePathNodeSpacing([25, 8, 0, 0], 800, 4);
 * // Returns: [150, 300, 500, 650] (optimized X positions)
 * 
 * @example
 * const singleNode = calculatePathNodeSpacing([0], 800, 1);
 * // Returns: [400] (centered position)
 * 
 * @see TREES_SETTINGS.visual.subtreeSizeSpacingMultiplier
 */
export function calculatePathNodeSpacing(subtreeSizes, totalWidth, pathNodesCount) {
    if (pathNodesCount === 0) return [];
    if (pathNodesCount === 1) return [totalWidth / 2];
    
    const baseMargin = TREES_SETTINGS.visual.rectMargin;
    const spacingMultiplier = TREES_SETTINGS.visual.subtreeSizeSpacingMultiplier || 3;
    const rectWidth = TREES_SETTINGS.visual.rectWidth;
    
    const margins = [];
    for (let i = 0; i < pathNodesCount - 1; i++) {
        const leftSubtreeSize = subtreeSizes[i] || 0;
        const rightSubtreeSize = subtreeSizes[i + 1] || 0;
        const maxSubtreeSize = Math.max(leftSubtreeSize, rightSubtreeSize);
        
        const margin = baseMargin + (maxSubtreeSize * spacingMultiplier);
        margins.push(margin);
    }
    
    const totalRectWidth = pathNodesCount * rectWidth;
    const totalMarginWidth = margins.reduce((sum, margin) => sum + margin, 0);
    const requiredWidth = totalRectWidth + totalMarginWidth;
    
    const scaleFactor = requiredWidth > totalWidth ? 
        Math.max(0.5, (totalWidth - totalRectWidth) / totalMarginWidth) : 1;
    
    const scaledMargins = margins.map(margin => margin * scaleFactor);
    const finalRequiredWidth = totalRectWidth + scaledMargins.reduce((sum, margin) => sum + margin, 0);
    const startX = (totalWidth - finalRequiredWidth) / 2 + rectWidth / 2;
    
    const positions = [];
    let currentX = startX;
    
    for (let i = 0; i < pathNodesCount; i++) {
        positions.push(currentX);
        if (i < pathNodesCount - 1) {
            currentX += rectWidth + scaledMargins[i];
        }
    }
    
    return positions;
}

/**
 * Positions path nodes in a horizontal line layout.
 * Sets coordinates and path status for all nodes in the instance path.
 * 
 * @param {Array<TreeNode>} pathNodes - Array of path nodes to position
 * @param {Array<number>} pathPositions - Array of X coordinates for positioning
 * @param {number} centerY - Y coordinate for horizontal alignment
 * @example
 * positionPathNodes(pathNodes, [150, 300, 450], 400);
 * // Positions path nodes horizontally at Y=400
 */
function positionPathNodes(pathNodes, pathPositions, centerY) {
    pathNodes.forEach((node, index) => {
        node.x = pathPositions[index];
        node.y = centerY;
        node.isInPath = true;
        node.isHidden = false;
    });
}

/**
 * Positions all off-path subtrees using D3 tree layout algorithm.
 * Alternates subtree placement above and below path for balanced layout.
 * 
 * @param {Array<TreeNode>} pathNodes - Array of path nodes with children
 * @param {Array<number>} instancePath - Array of node IDs in instance path
 * @example
 * positionOffPathSubtrees(pathNodes, [0, 1, 3, 7]);
 * // Positions all off-path subtrees around the instance path
 * 
 * @see positionSubtreeWithD3Layout
 */
function positionOffPathSubtrees(pathNodes, instancePath) {
    let globalOffPathCounter = 0;
    
    pathNodes.forEach(pathNode => {
        if (!pathNode.children) return;
        
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        offPathChildren.forEach(subtreeRoot => {
            const isAbove = globalOffPathCounter % 2 === 0;
            positionSubtreeWithD3Layout(
                subtreeRoot, 
                pathNode.x, 
                pathNode.y, 
                isAbove
            );
            globalOffPathCounter++;
        });
    });
}

/**
 * Expands a collapsed subtree to show all descendant nodes.
 * Makes entire subtree visible and updates expansion states appropriately.
 * 
 * @param {TreeNode} node - Node with hidden children to expand
 * @example
 * expandSubtree(collapsedNode);
 * // Shows all descendants and updates expansion flags
 * 
 * @see setDescendantsHidden
 */
export function expandSubtree(node) {
    if (!node.hasHiddenChildren || !node.children) return;
    
    function showAllDescendants(currentNode) {
        if (currentNode.children) {
            currentNode.children.forEach(child => {
                child.isHidden = false;
                
                if (!child.data.is_leaf && child.children && child.children.length > 0) {
                    child.hasHiddenChildren = false;
                    child.isExpanded = true;
                }
                
                showAllDescendants(child);
            });
        }
    }
    
    showAllDescendants(node);
    
    node.hasHiddenChildren = false;
    node.isExpanded = true;
}

/**
 * Collapses an expanded subtree to hide all descendant nodes.
 * Hides children and resets their expansion states for clean collapse.
 * 
 * @param {TreeNode} node - Expanded node to collapse
 * @example
 * collapseSubtree(expandedNode);
 * // Hides all descendants and resets expansion states
 * 
 * @see setDescendantsHidden
 * @see resetExpansionStates
 */
export function collapseSubtree(node) {
    if (!node.isExpanded || !node.children) return;
    
    node.children.forEach(child => {
        setDescendantsHidden(child, true);
        resetExpansionStates(child);
    });
    
    node.hasHiddenChildren = true;
    node.isExpanded = false;
}

/**
 * Resets expansion states when nodes are hidden during collapse operations.
 * Ensures consistent state management during subtree visibility changes.
 * 
 * @param {TreeNode} node - Node to reset expansion states for
 * @private
 * @example
 * // Internal usage only
 * resetExpansionStates(hiddenNode);
 */
function resetExpansionStates(node) {
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        node.hasHiddenChildren = true;
        node.isExpanded = false;
    }
    
    if (node.children) {
        node.children.forEach(child => resetExpansionStates(child));
    }
}

/**
 * Creates linear path layout for TreeSpawn visualization.
 * Main layout function that coordinates path positioning and subtree placement.
 * 
 * @param {d3.HierarchyNode} root - D3 hierarchy root node
 * @param {Object} metrics - Layout metrics and dimensions
 * @param {Array<number>} instancePath - Array of node IDs forming instance path
 * @returns {d3.HierarchyNode} Root node with applied layout and links function
 * @example
 * const layoutResult = createLinearPathLayout(hierarchyRoot, metrics, [0, 1, 3, 7]);
 * // Returns positioned tree with linear path layout
 * 
 * @example
 * // Fallback to standard layout
 * const standardLayout = createLinearPathLayout(root, metrics, []);
 * // Uses D3 tree layout when no valid path available
 * 
 * @see calculatePathNodeSpacing
 * @see positionPathNodes  
 * @see positionOffPathSubtrees
 */
export function createLinearPathLayout(root, metrics, instancePath) {
    const nodeMap = new Map(
        root.descendants().map(node => [node.data.node_id, node])
    );
    
    const pathNodes = instancePath
        .map(id => nodeMap.get(id))
        .filter(Boolean);
    
    if (pathNodes.length === 0) {
        const horizontalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitWidth;
        const verticalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitHeight;
 
        const treeLayout = d3.tree()
            .size([horizontalSpacing, verticalSpacing])
            .separation((a, b) => calculateSeparation());
        
        const result = treeLayout(root);
        
        result.descendants().forEach(node => {
            node.isHidden = false;
            node.isInPath = false;
            node.hasHiddenChildren = false;
        });
        
        return result;
    }

    const centerY = TREES_SETTINGS.size.innerHeight / 2;

    const subtreeSizes = calculatePathNodeSubtreeSizes(pathNodes, instancePath);

    const pathPositions = calculatePathNodeSpacing(
        subtreeSizes,
        TREES_SETTINGS.size.innerWidth,
        pathNodes.length
    );
    
    positionPathNodes(pathNodes, pathPositions, centerY);
    
    positionOffPathSubtrees(pathNodes, instancePath);

    root.descendants().forEach(node => {
        node.isInPath = node.isInPath || false;
        if (node.isHidden === undefined) {
            node.isHidden = false;
        }
        if (node.hasHiddenChildren === undefined) {
            node.hasHiddenChildren = false;
        }
    });

    root.links = function() {
        return this.descendants()
            .filter(node => node.parent && !node.isHidden && !node.parent.isHidden)
            .map(node => ({ source: node.parent, target: node }));
    };

    return root;
}
