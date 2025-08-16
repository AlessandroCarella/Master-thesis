// metrics.js - Updated with Improved Dynamic Spacing to Prevent Overlaps
export function calculateMetrics(root, SETTINGS) {
    const levelCounts = {};
    root.descendants().forEach((node) => {
        levelCounts[node.depth] = (levelCounts[node.depth] || 0) + 1;
    });
    const maxDepth = Math.max(...root.descendants().map((d) => d.depth));
    const totalNodes = root.descendants().length;

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
                SETTINGS.node.baseRadius,
                SETTINGS.node.minRadius,
                SETTINGS.node.maxRadius
            );
        },
        get depthSpacing() {
            return SETTINGS.size.innerHeight / (maxDepth + 1);
        },
        get treeWidth() {
            return this.depthSpacing * (maxDepth + 1);
        },
        get linkStrokeWidth() {
            return calculateLogScale(
                this.totalNodes,
                SETTINGS.node.baseLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                SETTINGS.node.maxLinkAndNodeBorderStrokeWidth
            );
        },
        get nodeBorderStrokeWidth() {
            return this.linkStrokeWidth;
        },
    };
}

export function calculateSeparation(a, b, metrics, SETTINGS, root) {
    return SETTINGS.tree.minSplitWidth * 2;
}

export function createTreeLayout(metrics, SETTINGS, root) {
    const horizontalSpacing =
        root.descendants().length * SETTINGS.tree.minSplitWidth;
    const verticalSpacing =
        root.descendants().length * SETTINGS.tree.minSplitHeight;
    return d3
        .tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) =>
            calculateSeparation(a, b, metrics, SETTINGS, root)
        );
}

// Helper function to calculate dynamic spacing based on node count and size
function calculateDynamicSpacing(nodeCount, baseSpacing, nodeRadius, minSpacing = 40) {
    // Calculate spacing based on node size and count
    const nodeWidth = nodeRadius * 3; // Account for rectangle width of path nodes
    const requiredSpacing = Math.max(nodeWidth + 20, minSpacing); // 20px buffer
    
    // If we have many nodes, we need more space
    const spacingMultiplier = Math.max(1, Math.sqrt(nodeCount / 3));
    
    return Math.max(requiredSpacing * spacingMultiplier, baseSpacing);
}

// Helper function to calculate vertical spacing for levels
function calculateVerticalSpacing(level, baseSpacing, nodeRadius) {
    const nodeHeight = nodeRadius * 1.5; // Account for rectangle height
    const minVerticalSpacing = nodeHeight + 30; // 30px buffer
    
    // Increase spacing for deeper levels to prevent overlap
    const levelMultiplier = 1 + (level * 0.3);
    
    return Math.max(minVerticalSpacing * levelMultiplier, baseSpacing);
}

// Helper function to distribute nodes horizontally to avoid overlap
function distributeNodesHorizontally(nodes, centerX, baseSpacing, nodeRadius) {
    if (nodes.length === 0) return [];
    if (nodes.length === 1) return [centerX];
    
    const nodeWidth = nodeRadius * 3 + 20; // Include buffer
    const totalWidth = Math.max(
        (nodes.length - 1) * baseSpacing,
        (nodes.length - 1) * nodeWidth
    );
    
    const positions = [];
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < nodes.length; i++) {
        positions.push(startX + (totalWidth / (nodes.length - 1)) * i);
    }
    
    return positions;
}

export function createLinearPathLayout(root, metrics, SETTINGS, instancePath) {
    // Create a lookup map for nodes by ID
    const nodeMap = new Map();
    root.descendants().forEach(node => {
        nodeMap.set(node.data.node_id, node);
    });

    // Get path nodes in order
    const pathNodes = instancePath.map(id => nodeMap.get(id)).filter(Boolean);
    
    if (pathNodes.length === 0) {
        // Fallback to regular tree layout if no instance path
        const treeLayout = createTreeLayout(metrics, SETTINGS, root);
        return treeLayout(root);
    }

    // Position path nodes in a horizontal line at the center
    const centerY = SETTINGS.size.innerHeight / 2;
    const pathSpacing = calculateDynamicSpacing(
        pathNodes.length, 
        SETTINGS.size.innerWidth / (pathNodes.length + 1),
        metrics.nodeRadius,
        80 // Minimum spacing for path nodes
    );
    
    // Distribute path nodes with proper spacing
    const pathPositions = distributeNodesHorizontally(
        pathNodes,
        SETTINGS.size.innerWidth / 2,
        pathSpacing,
        metrics.nodeRadius
    );
    
    pathNodes.forEach((node, index) => {
        node.x = pathPositions[index] || pathSpacing * (index + 1);
        node.y = centerY;
        node.isInPath = true;
    });

    // Position off-path subtrees with improved spacing
    const baseVerticalOffset = calculateVerticalSpacing(1, 120, metrics.nodeRadius);
    const baseSubtreeSpacing = calculateDynamicSpacing(3, 80, metrics.nodeRadius);
    
    // Global counter for alternating pattern across ALL off-path branches
    let globalOffPathCounter = 0;
    
    // Track used positions to avoid overlaps
    const usedPositions = new Map(); // level -> array of {x, y, width, height}
    
    pathNodes.forEach((pathNode, pathIndex) => {
        if (!pathNode.children) return;
        
        // Find children that are NOT in the instance path
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        // Position off-path children using global alternating pattern
        offPathChildren.forEach((child) => {
            const isAbove = globalOffPathCounter % 2 === 0;
            const yPosition = centerY + (isAbove ? -baseVerticalOffset : baseVerticalOffset);
            
            // Check for conflicts with existing nodes and adjust if necessary
            const adjustedPosition = findNonOverlappingPosition(
                pathNode.x, 
                yPosition, 
                baseSubtreeSpacing, 
                metrics.nodeRadius, 
                usedPositions, 
                1, // level
                isAbove
            );
            
            // Position this subtree
            positionSubtree(
                child, 
                adjustedPosition.x, 
                adjustedPosition.y, 
                baseSubtreeSpacing, 
                isAbove, 
                metrics.nodeRadius,
                usedPositions
            );
            
            // Increment global counter for next off-path branch
            globalOffPathCounter++;
        });
    });

    // Mark all nodes with their path status
    root.descendants().forEach(node => {
        if (!node.hasOwnProperty('isInPath')) {
            node.isInPath = false;
        }
    });

    // Create links function for compatibility
    root.links = function() {
        const links = [];
        this.descendants().forEach(node => {
            if (node.parent) {
                links.push({
                    source: node.parent,
                    target: node
                });
            }
        });
        return links;
    };

    return root;
}

// Helper function to find a position that doesn't overlap with existing nodes
function findNonOverlappingPosition(preferredX, preferredY, spacing, nodeRadius, usedPositions, level, isAbove) {
    const nodeWidth = nodeRadius * 3 + 40; // Include extra buffer
    const nodeHeight = nodeRadius * 1.5 + 40; // Include extra buffer
    
    let testX = preferredX;
    let testY = preferredY;
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
        let hasOverlap = false;
        
        // Check against all used positions at this level and adjacent levels
        for (let checkLevel = Math.max(0, level - 1); checkLevel <= level + 1; checkLevel++) {
            const levelPositions = usedPositions.get(checkLevel) || [];
            
            for (const pos of levelPositions) {
                if (isOverlapping(
                    testX, testY, nodeWidth, nodeHeight,
                    pos.x, pos.y, pos.width, pos.height
                )) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (hasOverlap) break;
        }
        
        if (!hasOverlap) {
            // Record this position as used
            if (!usedPositions.has(level)) {
                usedPositions.set(level, []);
            }
            usedPositions.get(level).push({
                x: testX,
                y: testY,
                width: nodeWidth,
                height: nodeHeight
            });
            
            return { x: testX, y: testY };
        }
        
        // Try a different position
        if (attempts % 2 === 0) {
            testX += spacing * 0.7; // Move right
        } else {
            testX = preferredX - spacing * 0.7 * Math.ceil(attempts / 2); // Move left
        }
        
        attempts++;
    }
    
    // If we can't find a non-overlapping position, use the preferred position anyway
    // but adjust Y to avoid major overlap
    testY = preferredY + (isAbove ? -spacing * 0.5 : spacing * 0.5);
    
    if (!usedPositions.has(level)) {
        usedPositions.set(level, []);
    }
    usedPositions.get(level).push({
        x: testX,
        y: testY,
        width: nodeWidth,
        height: nodeHeight
    });
    
    return { x: testX, y: testY };
}

// Helper function to check if two rectangles overlap
function isOverlapping(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1/2 < x2 - w2/2 || 
             x2 + w2/2 < x1 - w1/2 || 
             y1 + h1/2 < y2 - h2/2 || 
             y2 + h2/2 < y1 - h1/2);
}

function positionSubtree(node, centerX, baseY, spacing, isAbove, nodeRadius, usedPositions) {
    if (!node) return;
    
    // Position the root of this subtree
    node.x = centerX;
    node.y = baseY;
    node.isInPath = false;
    
    // If this node has children, position them in a small tree
    if (node.children && node.children.length > 0) {
        const childSpacing = calculateDynamicSpacing(
            node.children.length, 
            spacing * 0.7, 
            nodeRadius,
            60
        );
        const childVerticalSpacing = calculateVerticalSpacing(2, 80, nodeRadius);
        
        // Distribute children horizontally
        const childPositions = distributeNodesHorizontally(
            node.children,
            centerX,
            childSpacing,
            nodeRadius
        );
        
        node.children.forEach((child, index) => {
            const childX = childPositions[index];
            const childY = isAbove ? 
                baseY - childVerticalSpacing : 
                baseY + childVerticalSpacing;
            
            positionSubtreeRecursive(
                child, 
                childX, 
                childY, 
                childSpacing * 0.8, 
                childVerticalSpacing * 0.9, 
                isAbove, 
                nodeRadius,
                usedPositions,
                3 // level
            );
        });
    }
}

function positionSubtreeRecursive(node, x, y, horizontalSpacing, verticalSpacing, isAbove, nodeRadius, usedPositions, level) {
    if (!node) return;
    
    node.x = x;
    node.y = y;
    node.isInPath = false;
    
    if (node.children && node.children.length > 0) {
        const childSpacing = calculateDynamicSpacing(
            node.children.length,
            horizontalSpacing,
            nodeRadius,
            50
        );
        const newVerticalSpacing = calculateVerticalSpacing(level, verticalSpacing, nodeRadius);
        
        // Distribute children horizontally
        const childPositions = distributeNodesHorizontally(
            node.children,
            x,
            childSpacing,
            nodeRadius
        );
        
        node.children.forEach((child, index) => {
            const childX = childPositions[index];
            const childY = isAbove ? 
                y - newVerticalSpacing : 
                y + newVerticalSpacing;
            
            positionSubtreeRecursive(
                child, 
                childX, 
                childY, 
                childSpacing * 0.8, 
                newVerticalSpacing * 0.9, 
                isAbove, 
                nodeRadius,
                usedPositions,
                level + 1
            );
        });
    }
}

export function calculateNodeRadius(d, metrics) {
    return metrics.nodeRadius;
}

export function calculateInitialTransform(treeData, SETTINGS) {
    const allNodes = treeData.descendants();
    const [minX, maxX] = d3.extent(allNodes, (d) => d.x);
    const [minY, maxY] = d3.extent(allNodes, (d) => d.y);

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = SETTINGS.size.innerWidth / (treeWidth + 200); // Increased padding
    const scaleY = SETTINGS.size.innerHeight / (treeHeight + 200);
    const k = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 1x initially

    const translateX =
        (SETTINGS.size.innerWidth - treeWidth * k) / 2 -
        minX * k +
        SETTINGS.margin.left;
    const translateY =
        (SETTINGS.size.innerHeight - treeHeight * k) / 2 -
        minY * k +
        SETTINGS.margin.top;

    const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(k);
    transform.k = k;
    return transform;
}

export function getStrokeWidth(weighted_n_samples, totalSamples, linkStrokeWidth) {
    // This method differs from the get linkStrokeWidth() in calculateMetrics because this is used for
    // determining the size of the link based on the number of samples that go from one node to the next
    const ratio = weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * linkStrokeWidth;

    return strokeWidth;
}