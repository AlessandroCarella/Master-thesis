import { calculateSeparation } from './metrics.js';

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

// Position a subtree using D3 tree layout (stores full layout but only shows root)
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
    const [minX, maxX] = d3.extent(nodes, d => d.x);
    const [minY, maxY] = d3.extent(nodes, d => d.y);
    
    // For the root node, we want it positioned directly above/below the anchor
    // For other nodes, we want them positioned relative to the root
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
                // Root should be closest to the path (highest Y value in the subtree)
                // Leaves should be furthest from the path (lowest Y values)
                // Since smaller Y = higher on screen, we need to invert the layout
                
                // Calculate the distance from root for this node
                const distanceFromRoot = hierarchyNode.y - minY;
                
                // Position the root just above the path, and other nodes further up
                originalNode.y = anchorY - SETTINGS.visual.verticalGap - distanceFromRoot;
            } else {
                // For trees below the path, normal positioning
                // Root should be closest to path, leaves further down
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY + SETTINGS.visual.verticalGap + distanceFromRoot;
            }
            
            originalNode.isInPath = false;
            
            // Mark all non-root subtree nodes as hidden initially
            if (hierarchyNode !== rootHierarchyNode) {
                originalNode.isHidden = true;
                originalNode.subtreeRoot = subtreeRoot; // Reference to subtree root for expansion
            } else {
                originalNode.isHidden = false;
                originalNode.hasHiddenChildren = true; // Mark that this node has hidden children
            }
        }
    });
}

// Helper function to distribute path nodes horizontally with constant spacing
function distributePathNodesHorizontally(pathNodes, totalWidth, nodeRadius, SETTINGS) {
    if (pathNodes.length === 0) return [];
    if (pathNodes.length === 1) return [totalWidth / 2];
    
    // Calculate total width needed for all rectangles and margins
    const totalRectWidth = pathNodes.length * SETTINGS.visual.rectWidth;
    const totalMarginWidth = (pathNodes.length - 1) * SETTINGS.visual.rectMargin;
    const requiredWidth = totalRectWidth + totalMarginWidth;
    
    // Calculate starting position to center the entire group
    const startX = (totalWidth - requiredWidth) / 2 + SETTINGS.visual.rectWidth / 2;
    
    // Calculate positions with constant spacing
    const positions = [];
    for (let i = 0; i < pathNodes.length; i++) {
        const x = startX + i * (SETTINGS.visual.rectWidth + SETTINGS.visual.rectMargin);
        positions.push(x);
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

// Position all off-path subtrees using D3 tree layout (only showing root nodes)
function positionOffPathSubtrees(pathNodes, instancePath, centerY, metrics, SETTINGS) {
    let globalOffPathCounter = 0;
    
    pathNodes.forEach(pathNode => {
        if (!pathNode.children) return;
        
        // Find children that are not in the instance path
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        // Position each off-path subtree (full layout calculated, but only root shown)
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

// Function to expand a subtree (show all hidden children)
export function expandSubtree(subtreeRootNode) {
    if (!subtreeRootNode.hasHiddenChildren) return;
    
    // Find all nodes that belong to this subtree and make them visible
    function showDescendants(node) {
        if (node.subtreeRoot === subtreeRootNode || node === subtreeRootNode) {
            node.isHidden = false;
            if (node.children) {
                node.children.forEach(showDescendants);
            }
        }
    }
    
    if (subtreeRootNode.children) {
        subtreeRootNode.children.forEach(showDescendants);
    }
    
    subtreeRootNode.hasHiddenChildren = false;
    subtreeRootNode.isExpanded = true;
}

// Function to collapse a subtree (hide all children except root)
export function collapseSubtree(subtreeRootNode) {
    if (!subtreeRootNode.isExpanded) return;
    
    // Find all nodes that belong to this subtree and hide them (except root)
    function hideDescendants(node) {
        if (node !== subtreeRootNode && (node.subtreeRoot === subtreeRootNode || node === subtreeRootNode)) {
            node.isHidden = true;
            if (node.children) {
                node.children.forEach(hideDescendants);
            }
        }
    }
    
    if (subtreeRootNode.children) {
        subtreeRootNode.children.forEach(hideDescendants);
    }
    
    subtreeRootNode.hasHiddenChildren = true;
    subtreeRootNode.isExpanded = false;
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
        });
        
        return result;
    }

    const centerY = SETTINGS.size.innerHeight / 2;

    // Calculate horizontal positions for path nodes with spacing from settings
    const pathPositions = distributePathNodesHorizontally(
        pathNodes,
        SETTINGS.size.innerWidth,
        metrics.nodeRadius,
        SETTINGS
    );
    
    // Position path nodes horizontally
    positionPathNodes(pathNodes, pathPositions, centerY);
    
    // Position off-path subtrees using D3 tree layout (only roots visible initially)
    positionOffPathSubtrees(pathNodes, instancePath, centerY, metrics, SETTINGS);

    // Mark all nodes with path status and ensure visibility flags are set
    root.descendants().forEach(node => {
        node.isInPath = node.isInPath || false;
        if (node.isHidden === undefined) {
            node.isHidden = false; // Default to visible for path nodes
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