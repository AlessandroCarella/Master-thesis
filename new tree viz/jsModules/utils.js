import { DEFAULT_COLORS } from './constants.js';

export function getClassColor(classLabel) {
    if (!classLabel) return "#cccccc";
    const classNumber = parseInt(classLabel.replace('class_', ''));
    return DEFAULT_COLORS[classNumber % DEFAULT_COLORS.length];
}

export function findInstancePath(nodes, instance) {
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.node_id, node));
    
    const path = [];
    let currentNodeId = 0; // Start from root
    
    while (currentNodeId !== null) {
        const node = nodeMap.get(currentNodeId);
        path.push(currentNodeId);
        
        if (node.is_leaf) {
            break;
        }
        
        const featureValue = instance[node.feature_name];
        currentNodeId = featureValue <= node.threshold ? node.left_child : node.right_child;
    }
    
    return path;
}

export function buildHierarchy(nodes, instancePath) {
    const nodeMap = new Map();
    nodes.forEach(node => {
        nodeMap.set(node.node_id, {
            ...node,
            children: [],
            isMainPath: instancePath.includes(node.node_id)
        });
    });
    
    // Build parent-child relationships
    nodes.forEach(node => {
        const nodeObj = nodeMap.get(node.node_id);
        if (node.left_child !== null) {
            nodeObj.children.push(nodeMap.get(node.left_child));
        }
        if (node.right_child !== null) {
            nodeObj.children.push(nodeMap.get(node.right_child));
        }
    });
    
    return nodeMap.get(0); // Return root
}

export function getBounds(root) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    root.each(d => {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y);
    });
    return { minX, maxX, minY, maxY };
}