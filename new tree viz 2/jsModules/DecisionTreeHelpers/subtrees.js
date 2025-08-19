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

// Position a subtree using D3 tree layout
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
    
    // Calculate vertical positioning
    const verticalGap = 100; // Gap between path and subtree
    
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
                originalNode.y = anchorY - verticalGap - distanceFromRoot;
            } else {
                // For trees below the path, normal positioning
                // Root should be closest to path, leaves further down
                const distanceFromRoot = hierarchyNode.y - minY;
                originalNode.y = anchorY + verticalGap + distanceFromRoot;
            }
            
            originalNode.isInPath = false;
        }
    });
}

// Helper function to distribute path nodes horizontally
function distributePathNodesHorizontally(pathNodes, totalWidth, nodeRadius) {
    if (pathNodes.length === 0) return [];
    if (pathNodes.length === 1) return [totalWidth / 2];
    
    const spacing = totalWidth / (pathNodes.length + 1);
    return pathNodes.map((_, index) => spacing * (index + 1));
}

// Position path nodes in a horizontal line
function positionPathNodes(pathNodes, pathPositions, centerY) {
    pathNodes.forEach((node, index) => {
        node.x = pathPositions[index];
        node.y = centerY;
        node.isInPath = true;
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
        
        return treeLayout(root);
    }

    const centerY = SETTINGS.size.innerHeight / 2;

    // Calculate horizontal positions for path nodes
    const pathPositions = distributePathNodesHorizontally(
        pathNodes,
        SETTINGS.size.innerWidth,
        metrics.nodeRadius
    );
    
    // Position path nodes horizontally
    positionPathNodes(pathNodes, pathPositions, centerY);
    
    // Position off-path subtrees using D3 tree layout
    positionOffPathSubtrees(pathNodes, instancePath, centerY, metrics, SETTINGS);

    // Mark all nodes with path status
    root.descendants().forEach(node => {
        node.isInPath = node.isInPath || false;
    });

    // Create links function for the root
    root.links = function() {
        return this.descendants()
            .filter(node => node.parent)
            .map(node => ({ source: node.parent, target: node }));
    };

    return root;
}