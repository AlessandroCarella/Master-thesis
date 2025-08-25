import { calculateSeparation } from "../TreesCommon/metrics.js";

// Helper function to create a D3 hierarchy from a node and its descendants
function createSubtreeHierarchy(node) {
    if (!node || !node.data) return null;
    
    // Create a hierarchy node that matches the original data structure
    const createHierarchyNode = (treeNode) => {
        const hierarchyData = {
            ...treeNode.data,
            children: treeNode.children ? treeNode.children.map(createHierarchyNode) : []
        };
        return hierarchyData;
    };
    
    return d3.hierarchy(createHierarchyNode(node));
}

// Create D3 tree layout with the same settings as original implementation
function createSubtreeLayout(subtreeRoot, metrics, SETTINGS) {
    if (!subtreeRoot) return null;
    
    const subtreeNodes = subtreeRoot.descendants();
    const horizontalSpacing = subtreeNodes.length * SETTINGS.tree.minSplitWidth;
    const verticalSpacing = subtreeNodes.length * SETTINGS.tree.minSplitHeight;
    
    return d3.tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) => calculateSeparation(a, b, metrics, SETTINGS, subtreeRoot));
}

// Helper function to set up node expansion states with configurable initial depth
function setupNodeExpansionStates(node, isSubtreeRoot = false, SETTINGS, currentDepth = 0) {
    const maxInitialDepth = SETTINGS.tree.initialVisibleDepth;
    
    // Only non-leaf nodes can be expanded/collapsed
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        // If we're at or beyond the max initial depth, mark as having hidden children
        if (currentDepth >= maxInitialDepth) {
            node.hasHiddenChildren = true;
            node.isExpanded = false;
        } else {
            // Within initial depth - show as expanded
            node.hasHiddenChildren = false;
            node.isExpanded = true;
        }
    } else {
        node.hasHiddenChildren = false;
        node.isExpanded = false;
    }
    
    // Set initial visibility
    if (isSubtreeRoot) {
        node.isHidden = false;
        // For subtree root, set visibility based on depth
        if (node.children) {
            node.children.forEach(child => {
                setupNodeExpansionStatesRecursive(child, SETTINGS, currentDepth + 1, maxInitialDepth);
            });
        }
    }
}

// Recursive helper to set up expansion states for all nodes in subtree
function setupNodeExpansionStatesRecursive(node, SETTINGS, currentDepth, maxInitialDepth) {
    // Set visibility based on depth
    node.isHidden = currentDepth > maxInitialDepth;
    
    // Only non-leaf nodes can be expanded/collapsed
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        if (currentDepth >= maxInitialDepth) {
            // At or beyond max depth - collapsed with hidden children
            node.hasHiddenChildren = true;
            node.isExpanded = false;
        } else {
            // Within initial depth - expanded
            node.hasHiddenChildren = false;
            node.isExpanded = true;
        }
    } else {
        node.hasHiddenChildren = false;
        node.isExpanded = false;
    }
    
    // Continue recursively for all children
    if (node.children) {
        node.children.forEach(child => {
            setupNodeExpansionStatesRecursive(child, SETTINGS, currentDepth + 1, maxInitialDepth);
        });
    }
}

// Helper function to recursively set visibility of descendants
function setDescendantsHidden(node, hidden) {
    node.isHidden = hidden;
    if (node.children) {
        node.children.forEach(child => setDescendantsHidden(child, hidden));
    }
}

// Helper function to calculate the total number of nodes in a subtree
function calculateSubtreeSize(node) {
    if (!node) return 0;
    
    let count = 1; // Count the node itself
    
    if (node.children) {
        node.children.forEach(child => {
            count += calculateSubtreeSize(child);
        });
    }
    
    return count;
}

// Helper function to calculate subtree sizes for all path nodes
function calculatePathNodeSubtreeSizes(pathNodes, instancePath) {
    return pathNodes.map(pathNode => {
        if (!pathNode.children) return 0;
        
        // Find children that are not in the instance path (off-path subtrees)
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        // Calculate total size of all off-path subtrees from this node
        let totalSubtreeSize = 0;
        offPathChildren.forEach(subtreeRoot => {
            totalSubtreeSize += calculateSubtreeSize(subtreeRoot);
        });
        
        return totalSubtreeSize;
    });
}

// Position a subtree using D3 tree layout with hierarchical expand/collapse
function positionSubtreeWithD3Layout(subtreeRoot, anchorX, anchorY, isAbove, metrics, SETTINGS) {
    if (!subtreeRoot) return;
    
    // Create D3 hierarchy for the subtree
    const hierarchy = createSubtreeHierarchy(subtreeRoot);
    if (!hierarchy) return;
    
    // Apply D3 tree layout
    const treeLayout = createSubtreeLayout(hierarchy, metrics, SETTINGS);
    if (!treeLayout) return;

    const layoutResult = treeLayout(hierarchy);
    
    // Get the bounds of the laid out subtree
    const nodes = layoutResult.descendants();
    const [minY] = d3.extent(nodes, d => d.y);
    
    const rootHierarchyNode = layoutResult;
    
    // Apply the calculated offsets to position the subtree
    const hierarchyToOriginalMap = new Map();
    
    // Create mapping from hierarchy nodes back to original nodes
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
    
    // Apply positions to original nodes
    nodes.forEach(hierarchyNode => {
        const originalNode = hierarchyToOriginalMap.get(hierarchyNode);
        if (originalNode) {
            // For the root node, position it directly at the anchor X coordinate
            if (hierarchyNode === rootHierarchyNode) {
                originalNode.x = anchorX;
            } else {
                // For other nodes, position them relative to the root's layout position
                const rootLayoutX = rootHierarchyNode.x;
                const offsetFromRoot = hierarchyNode.x - rootLayoutX;
                originalNode.x = anchorX + offsetFromRoot;
            }
            
            if (isAbove) {
                // For trees above the path, we want them to grow upward
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY - SETTINGS.visual.verticalGap - distanceFromRoot;
            } else {
                // For trees below the path, normal positioning
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY + SETTINGS.visual.verticalGap + distanceFromRoot;
            }
            
            originalNode.isInPath = false;
            originalNode.subtreeRoot = subtreeRoot; // Reference to subtree root for identification
        }
    });
    
    // Set up expansion states for all nodes in the subtree
    setupNodeExpansionStates(subtreeRoot, true, SETTINGS);
}

// Helper function to distribute path nodes horizontally with variable spacing based on subtree sizes
function distributePathNodesHorizontally(pathNodes, totalWidth, nodeRadius, SETTINGS, subtreeSizes) {
    if (pathNodes.length === 0) return [];
    if (pathNodes.length === 1) return [totalWidth / 2];
    
    // Calculate variable margins based on subtree sizes
    const baseMargin = SETTINGS.visual.rectMargin; // Minimum margin
    const subtreeSizeMultiplier = SETTINGS.visual.subtreeSizeSpacingMultiplier || 2; // How much extra space per node
    
    // Calculate margins between each pair of adjacent nodes
    const margins = [];
    for (let i = 0; i < pathNodes.length - 1; i++) {
        // Use the larger of the two adjacent subtree sizes to determine spacing
        const leftSubtreeSize = subtreeSizes[i] || 0;
        const rightSubtreeSize = subtreeSizes[i + 1] || 0;
        const maxSubtreeSize = Math.max(leftSubtreeSize, rightSubtreeSize);
        
        // Calculate margin: base margin + additional space based on subtree size
        const margin = baseMargin + (maxSubtreeSize * subtreeSizeMultiplier);
        margins.push(margin);
    }
    
    // Calculate total width needed
    const totalRectWidth = pathNodes.length * SETTINGS.visual.rectWidth;
    const totalMarginWidth = margins.reduce((sum, margin) => sum + margin, 0);
    const requiredWidth = totalRectWidth + totalMarginWidth;
    
    // Calculate starting position to center the entire group
    const startX = (totalWidth - requiredWidth) / 2 + SETTINGS.visual.rectWidth / 2;
    
    // Calculate positions with variable spacing
    const positions = [];
    let currentX = startX;
    
    for (let i = 0; i < pathNodes.length; i++) {
        positions.push(currentX);
        
        // Move to next position (if not the last node)
        if (i < pathNodes.length - 1) {
            currentX += SETTINGS.visual.rectWidth + margins[i];
        }
    }
    
    return positions;
}

// Position path nodes in a horizontal line
function positionPathNodes(pathNodes, pathPositions, centerY) {
    pathNodes.forEach((node, index) => {
        node.x = pathPositions[index];
        node.y = centerY;
        node.isInPath = true;
        node.isHidden = false;
    });
}

// Position all off-path subtrees using D3 tree layout
function positionOffPathSubtrees(pathNodes, instancePath, centerY, metrics, SETTINGS) {
    let globalOffPathCounter = 0;
    
    pathNodes.forEach(pathNode => {
        if (!pathNode.children) return;
        
        // Find children that are not in the instance path
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        // Position each off-path subtree
        offPathChildren.forEach(subtreeRoot => {
            const isAbove = globalOffPathCounter % 2 === 0;
            positionSubtreeWithD3Layout(
                subtreeRoot, 
                pathNode.x, 
                pathNode.y, 
                isAbove, 
                metrics, 
                SETTINGS
            );
            globalOffPathCounter++;
        });
    });
}

// Function to expand a node (show the entire subtree below it)
export function expandSubtree(node) {
    if (!node.hasHiddenChildren || !node.children) return;
    
    // Show all descendants of this node
    function showAllDescendants(currentNode) {
        if (currentNode.children) {
            currentNode.children.forEach(child => {
                child.isHidden = false;
                
                // Set up expansion states for newly visible children
                if (!child.data.is_leaf && child.children && child.children.length > 0) {
                    child.hasHiddenChildren = false; // Mark as expanded since we're showing all descendants
                    child.isExpanded = true;
                }
                
                // Recursively show all descendants
                showAllDescendants(child);
            });
        }
    }
    
    // Show the entire subtree
    showAllDescendants(node);
    
    node.hasHiddenChildren = false;
    node.isExpanded = true;
}

// Function to collapse a single node (hide its children and all descendants)
export function collapseSubtree(node) {
    if (!node.isExpanded || !node.children) return;
    
    // Hide all descendants
    node.children.forEach(child => {
        setDescendantsHidden(child, true);
        // Reset expansion states of hidden nodes
        resetExpansionStates(child);
    });
    
    node.hasHiddenChildren = true;
    node.isExpanded = false;
}

// Helper function to reset expansion states when nodes are hidden
function resetExpansionStates(node) {
    if (!node.data.is_leaf && node.children && node.children.length > 0) {
        node.hasHiddenChildren = true;
        node.isExpanded = false;
    }
    
    if (node.children) {
        node.children.forEach(child => resetExpansionStates(child));
    }
}

// Main function to create the linear path layout
export function createLinearPathLayout(root, metrics, SETTINGS, instancePath) {
    // Create node lookup and validate path
    const nodeMap = new Map(
        root.descendants().map(node => [node.data.node_id, node])
    );
    
    const pathNodes = instancePath
        .map(id => nodeMap.get(id))
        .filter(Boolean);
    
    // Fallback to original D3 tree layout if no valid path
    if (pathNodes.length === 0) {
        const horizontalSpacing = root.descendants().length * SETTINGS.tree.minSplitWidth;
        const verticalSpacing = root.descendants().length * SETTINGS.tree.minSplitHeight;
        
        const treeLayout = d3.tree()
            .size([horizontalSpacing, verticalSpacing])
            .separation((a, b) => calculateSeparation(a, b, metrics, SETTINGS, root));
        
        const result = treeLayout(root);
        
        // Mark all nodes as visible in fallback mode
        result.descendants().forEach(node => {
            node.isHidden = false;
            node.isInPath = false;
            node.hasHiddenChildren = false;
        });
        
        return result;
    }

    const centerY = SETTINGS.size.innerHeight / 2;

    // Calculate subtree sizes for each path node
    const subtreeSizes = calculatePathNodeSubtreeSizes(pathNodes, instancePath);

    // Calculate horizontal positions for path nodes with variable spacing based on subtree sizes
    const pathPositions = distributePathNodesHorizontally(
        pathNodes,
        SETTINGS.size.innerWidth,
        metrics.nodeRadius,
        SETTINGS,
        subtreeSizes
    );
    
    // Position path nodes horizontally
    positionPathNodes(pathNodes, pathPositions, centerY);
    
    // Position off-path subtrees with hierarchical expand/collapse
    positionOffPathSubtrees(pathNodes, instancePath, centerY, metrics, SETTINGS);

    // Mark all nodes with path status and ensure visibility flags are set
    root.descendants().forEach(node => {
        node.isInPath = node.isInPath || false;
        if (node.isHidden === undefined) {
            node.isHidden = false; // Default to visible for path nodes
        }
        if (node.hasHiddenChildren === undefined) {
            node.hasHiddenChildren = false;
        }
    });

    // Create links function for the root
    root.links = function() {
        return this.descendants()
            .filter(node => node.parent && !node.isHidden && !node.parent.isHidden)
            .map(node => ({ source: node.parent, target: node }));
    };

    return root;
}