// metrics.js - Updated with Linear Path Layout
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
    const pathSpacing = SETTINGS.size.innerWidth / (pathNodes.length + 1);
    
    pathNodes.forEach((node, index) => {
        node.x = pathSpacing * (index + 1);
        node.y = centerY;
        node.isInPath = true;
    });

    // Position off-path subtrees alternating above and below
    const verticalOffset = 120; // Distance above/below center line
    const subtreeSpacing = 60; // Horizontal spacing between subtree nodes
    
    pathNodes.forEach((pathNode, pathIndex) => {
        if (!pathNode.children) return;
        
        // Find children that are NOT in the instance path
        const offPathChildren = pathNode.children.filter(child => 
            !instancePath.includes(child.data.node_id)
        );
        
        // Position off-path children alternating above and below
        offPathChildren.forEach((child, childIndex) => {
            const isAbove = childIndex % 2 === 0;
            const yPosition = centerY + (isAbove ? -verticalOffset : verticalOffset);
            
            // Position this subtree
            positionSubtree(child, pathNode.x, yPosition, subtreeSpacing, isAbove);
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

function positionSubtree(node, centerX, baseY, spacing, isAbove) {
    if (!node) return;
    
    // Position the root of this subtree
    node.x = centerX;
    node.y = baseY;
    node.isInPath = false;
    
    // If this node has children, position them in a small tree
    if (node.children && node.children.length > 0) {
        const childSpacing = spacing * 0.8;
        const childVerticalSpacing = 60;
        
        // Calculate positions for children
        const totalWidth = (node.children.length - 1) * childSpacing;
        const startX = centerX - totalWidth / 2;
        
        node.children.forEach((child, index) => {
            const childX = startX + index * childSpacing;
            const childY = isAbove ? 
                baseY - childVerticalSpacing : 
                baseY + childVerticalSpacing;
            
            positionSubtreeRecursive(child, childX, childY, childSpacing * 0.7, childVerticalSpacing * 0.8, isAbove);
        });
    }
}

function positionSubtreeRecursive(node, x, y, horizontalSpacing, verticalSpacing, isAbove) {
    if (!node) return;
    
    node.x = x;
    node.y = y;
    node.isInPath = false;
    
    if (node.children && node.children.length > 0) {
        const totalWidth = (node.children.length - 1) * horizontalSpacing;
        const startX = x - totalWidth / 2;
        
        node.children.forEach((child, index) => {
            const childX = startX + index * horizontalSpacing;
            const childY = isAbove ? 
                y - verticalSpacing : 
                y + verticalSpacing;
            
            positionSubtreeRecursive(child, childX, childY, horizontalSpacing * 0.8, verticalSpacing * 0.8, isAbove);
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

    const scaleX = SETTINGS.size.innerWidth / (treeWidth + 100); // Add padding
    const scaleY = SETTINGS.size.innerHeight / (treeHeight + 100);
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