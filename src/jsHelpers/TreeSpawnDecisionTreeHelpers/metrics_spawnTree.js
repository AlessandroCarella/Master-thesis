import { state } from "./state_spawnTree.js";
import { traceInstancePath } from "./dataProcessing_spawnTree.js";
import { createLinearPathLayout } from "./subtrees_spawnTree.js";

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
    // Get instance path from state or trace it
    let instancePath = state.instancePath;
    if (!instancePath || instancePath.length === 0) {
        instancePath = traceInstancePath();
    }

    // Return a function that applies the linear path layout
    // This maintains compatibility with the main file's expectation of treeLayout(root)
    return function(rootNode) {
        return createLinearPathLayout(rootNode, metrics, SETTINGS, instancePath);
    };
}

export function calculateNodeRadius(d, metrics) {
    return metrics.nodeRadius;
}

export function calculateInitialTransform(treeData, SETTINGS) {
    // Use ALL nodes (including hidden ones) for calculating initial zoom
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
    // Use total samples from state if not provided
    if (!totalSamples && state.treeData && state.treeData.length > 0) {
        totalSamples = state.treeData[0].n_samples;
    }
    
    const ratio = weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * linkStrokeWidth;
    return strokeWidth;
}

// Helper function to get tree depth from state
export function getTreeDepth() {
    if (!state.hierarchyRoot) return 0;
    
    function calculateDepth(node, depth = 0) {
        if (!node.children || node.children.length === 0) {
            return depth;
        }
        return Math.max(...node.children.map(child => calculateDepth(child, depth + 1)));
    }
    
    return calculateDepth(state.hierarchyRoot);
}

// Helper function to get tree statistics
export function getTreeStats() {
    if (!state.hierarchyRoot || !state.treeData) {
        return {
            totalNodes: 0,
            leafNodes: 0,
            internalNodes: 0,
            maxDepth: 0,
            totalSamples: 0
        };
    }
    
    const totalNodes = state.treeData.length;
    const leafNodes = state.treeData.filter(node => node.is_leaf).length;
    const internalNodes = totalNodes - leafNodes;
    const maxDepth = getTreeDepth();
    const totalSamples = state.treeData[0]?.n_samples || 0;
    
    return {
        totalNodes,
        leafNodes,
        internalNodes,
        maxDepth,
        totalSamples
    };
}