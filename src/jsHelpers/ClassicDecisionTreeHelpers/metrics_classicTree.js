import { classicTreeState } from "../TreesCommon/state.js"

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

export function calculateNodeRadius(d, metrics) {
    return metrics.nodeRadius;
}

export function calculateInitialTransform(treeData, SETTINGS) {
    const allNodes = treeData.descendants();
    const [minX, maxX] = d3.extent(allNodes, (d) => d.x);
    const [minY, maxY] = d3.extent(allNodes, (d) => d.y);

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = SETTINGS.size.innerWidth / treeWidth;
    const scaleY = SETTINGS.size.innerHeight / treeHeight;
    const k = Math.min(scaleX, scaleY);

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
    // Use total samples from classicTreeState if not provided
    if (!totalSamples && classicTreeState.treeData && classicTreeState.treeData.length > 0) {
        totalSamples = classicTreeState.treeData[0].n_samples;
    }
    
    // This method differs from the get linkStrokeWidth() in calculateMetrics because this is used for
    // determining the size of the link based on the number of samples that go from one node to the next
    const ratio = weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * linkStrokeWidth;

    return strokeWidth;
}

// Helper function to get tree depth from classicTreeState
export function getTreeDepth() {
    if (!classicTreeState.hierarchyRoot) return 0;
    
    function calculateDepth(node, depth = 0) {
        if (!node.children || node.children.length === 0) {
            return depth;
        }
        return Math.max(...node.children.map(child => calculateDepth(child, depth + 1)));
    }
    
    return calculateDepth(classicTreeState.hierarchyRoot);
}

// Helper function to get tree statistics
export function getTreeStats() {
    if (!classicTreeState.hierarchyRoot || !classicTreeState.treeData) {
        return {
            totalNodes: 0,
            leafNodes: 0,
            internalNodes: 0,
            maxDepth: 0,
            totalSamples: 0
        };
    }
    
    const totalNodes = classicTreeState.treeData.length;
    const leafNodes = classicTreeState.treeData.filter(node => node.is_leaf).length;
    const internalNodes = totalNodes - leafNodes;
    const maxDepth = getTreeDepth();
    const totalSamples = classicTreeState.treeData[0]?.n_samples || 0;
    
    return {
        totalNodes,
        leafNodes,
        internalNodes,
        maxDepth,
        totalSamples
    };
}