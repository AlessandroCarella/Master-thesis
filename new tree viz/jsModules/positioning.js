import { DIMENSIONS, LAYOUT_CONFIG, ANGLES } from './constants.js';

export function applyCustomPositioning(root, instancePath) {
    // First, identify main path nodes and sort by depth
    const mainPathNodes = [];
    root.each(d => {
        if (d.data.isMainPath) {
            mainPathNodes.push(d);
        }
    });
    mainPathNodes.sort((a, b) => a.depth - b.depth);
    
    // Position main path horizontally
    mainPathNodes.forEach((node, i) => {
        node.x = DIMENSIONS.height / 2; // Center vertically
        node.y = LAYOUT_CONFIG.startY + (i * LAYOUT_CONFIG.mainSpacing);
    });
    
    // For each main path node, position its non-main-path children at alternating up/down angles
    mainPathNodes.forEach((mainNode, mainNodeIndex) => {
        const nonMainChildren = mainNode.children ? mainNode.children.filter(child => !child.data.isMainPath) : [];
        
        if (nonMainChildren.length > 0) {
            // Position children at alternating up/down angles based on main node index
            nonMainChildren.forEach((child, index) => {
                // Alternate direction based on the main node's position in the sequence
                // Even indices (0, 2, 4...) go up, odd indices (1, 3, 5...) go down
                const goUp = mainNodeIndex % 2 === 0;
                
                // Calculate angle: up is negative (upward), down is positive (downward)
                const angle = goUp ? ANGLES.branchLeft : ANGLES.branchRight; // -45° (up) or +45° (down)
                
                child.x = mainNode.x + Math.sin(angle) * LAYOUT_CONFIG.branchDistance;
                child.y = mainNode.y + Math.cos(angle) * LAYOUT_CONFIG.branchDistance;
                
                // Position any children of these branch nodes
                positionBranchSubtree(child, angle);
            });
        }
    });
}

function positionBranchSubtree(node, parentAngle) {
    if (!node.children || node.children.length === 0) return;
    
    node.children.forEach((child, index) => {
        // Continue in the same general direction but with some spread for multiple children
        let childAngle = parentAngle;
        
        // If there are multiple children, spread them out
        if (node.children.length > 1) {
            childAngle = parentAngle + (index === 0 ? -LAYOUT_CONFIG.angleSpread : LAYOUT_CONFIG.angleSpread);
        }
        
        child.x = node.x + Math.sin(childAngle) * LAYOUT_CONFIG.branchDistance;
        child.y = node.y + Math.cos(childAngle) * LAYOUT_CONFIG.branchDistance;
        
        // Recursively position children with the same distance
        positionBranchSubtree(child, childAngle);
    });
}

export function getConnectionPoint(sourceNode, targetNode) {
    if (!sourceNode.data.isMainPath) {
        // If source is not main path, use center
        return { x: sourceNode.x, y: sourceNode.y };
    }

    // For main path rectangular nodes, connect to top or bottom center
    const rectHeight = sourceNode.data.is_leaf ? LAYOUT_CONFIG.rectHeight.leaf : LAYOUT_CONFIG.rectHeight.decision;

    // If target is above source, use top center; if below, use bottom center
    if (targetNode.x < sourceNode.x) {
        // Top center
        return { x: sourceNode.x - rectHeight / 2, y: sourceNode.y };
    } else {
        // Bottom center
        return { x: sourceNode.x + rectHeight / 2, y: sourceNode.y };
    }
}