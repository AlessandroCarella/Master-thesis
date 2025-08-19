// subtrees.js - Updated to use D3 tree layout for subtrees
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
    
    // Calculate offset to center the subtree horizontally around the anchor point
    const subtreeWidth = maxX - minX;
    const offsetX = anchorX - (minX + subtreeWidth / 2);
    
    // Calculate vertical offset based on whether subtree is above or below path
    const subtreeHeight = maxY - minY;
    const verticalGap = 100; // Gap between path and subtree
    const offsetY = isAbove ? 
        anchorY - maxY - verticalGap : 
        anchorY - minY + verticalGap;
    
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
            originalNode.x = hierarchyNode.x + offsetX;
            originalNode.y = hierarchyNode.y + offsetY;
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