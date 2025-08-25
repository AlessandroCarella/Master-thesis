import { getTreeState } from "./state.js";
import { blocksTreeState } from "./state.js";
import { traceInstancePath } from "./dataProcessing.js";
import { createLinearPathLayout } from "../TreeSpawnDecisionTreeHelpers/subtrees_spawnTree.js";

export function calculateMetrics(root, SETTINGS, treeKind) {
    if (treeKind === "blocks") {
        return calculateBlocksMetrics(root, SETTINGS);
    } else {
        return calculateStandardMetrics(root, SETTINGS, treeKind);
    }
}

function calculateStandardMetrics(root, SETTINGS, treeKind) {
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

function calculateBlocksMetrics(allPaths, SETTINGS, instancePath) {
    // Unique nodes count
    const allNodes = new Set();
    allPaths.forEach((path) => path.forEach((id) => allNodes.add(id)));
    const totalNodes = allNodes.size;

    const nodeScaleFactor = Math.max(1, Math.sqrt(totalNodes / 100));
    const maxDepth = Math.max(...allPaths.map((p) => p.length - 1));

    return {
        totalNodes,
        maxDepth,
        nodeScaleFactor,
        get nodeSpacing() {
            return SETTINGS.layout.minSpacing * this.nodeScaleFactor;
        },
        get requiredWidth() {
            return (this.maxDepth + 1) * this.nodeSpacing * 2;
        },
        get requiredHeight() {
            return allPaths.length * this.nodeSpacing * SETTINGS.layout.scaleFactor.multiplier;
        },
        get linkStrokeWidth() {
            return Math.max(
                SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                Math.min(
                    SETTINGS.node.maxLinkAndNodeBorderStrokeWidth,
                    SETTINGS.node.baseLinkAndNodeBorderStrokeWidth * Math.sqrt(this.totalNodes / 30)
                )
            );
        },
    };
}

export function calculateSeparation(a, b, metrics, SETTINGS, root, treeKind) {
    return SETTINGS.tree.minSplitWidth * 2;
}

export function createTreeLayout(metrics, SETTINGS, root, treeKind) {
    if (treeKind === "spawn") {
        // Get instance path from spawnTreeState or trace it
        const state = getTreeState(treeKind);
        let instancePath = state.instancePath;
        if (!instancePath || instancePath.length === 0) {
            instancePath = traceInstancePath();
        }

        // Return a function that applies the linear path layout
        return function(rootNode) {
            return createLinearPathLayout(rootNode, metrics, SETTINGS, instancePath);
        };
    } else {
        // Standard D3 tree layout for classic trees
        const horizontalSpacing = root.descendants().length * SETTINGS.tree.minSplitWidth;
        const verticalSpacing = root.descendants().length * SETTINGS.tree.minSplitHeight;
        
        return d3.tree()
            .size([horizontalSpacing, verticalSpacing])
            .separation((a, b) => calculateSeparation(a, b, metrics, SETTINGS, root, treeKind));
    }
}

export function calculateNodeRadius(d, metrics, treeKind) {
    return metrics.nodeRadius;
}

export function calculateInitialTransform(treeData, SETTINGS, treeKind) {
    // Use ALL nodes (including hidden ones for spawn) for calculating initial zoom
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

export function getStrokeWidth(weighted_n_samples, totalSamples, linkStrokeWidth, treeKind) {
    const state = getTreeState(treeKind);
    
    // Use total samples from state if not provided
    if (!totalSamples && state.treeData && state.treeData.length > 0) {
        totalSamples = state.treeData[0].n_samples;
    }
    
    const ratio = weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * linkStrokeWidth;

    return strokeWidth;
}

export function getTreeDepth(treeKind) {
    const state = getTreeState(treeKind);
    if (!state.hierarchyRoot) return 0;
    
    if (treeKind === "blocks") {
        return state.hierarchyRoot.height;
    } else {
        function calculateDepth(node, depth = 0) {
            if (!node.children || node.children.length === 0) {
                return depth;
            }
            return Math.max(...node.children.map(child => calculateDepth(child, depth + 1)));
        }
        return calculateDepth(state.hierarchyRoot);
    }
}

export function getTreeStats(treeKind) {
    const state = getTreeState(treeKind);
    
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
    const maxDepth = getTreeDepth(treeKind);
    const totalSamples = state.treeData[0]?.n_samples || 0;
    
    if (treeKind === "blocks") {
        const leaves = state.hierarchyRoot.leaves().map((d) => d.data);
        const classDistribution = getClassDistribution(leaves);
        
        return {
            totalNodes,
            leafNodes,
            internalNodes,
            maxDepth,
            totalSamples,
            classDistribution
        };
    }
    
    return {
        totalNodes,
        leafNodes,
        internalNodes,
        maxDepth,
        totalSamples
    };
}

function getClassDistribution(leaves) {
    const dist = {};
    leaves.forEach((leaf) => {
        const cls = leaf.class_label || "unknown";
        dist[cls] = (dist[cls] || 0) + 1;
    });
    return dist;
}

export function getUniqueClasses(treeKind) {
    if (treeKind === "blocks") {
        const state = getTreeState(treeKind);
        const leaves = state.hierarchyRoot ? state.hierarchyRoot.leaves().map((l) => l.data) : [];
        return [...new Set(leaves.map((l) => l.class_label || "unknown"))].sort();
    } else {
        // For classic and spawn trees, get unique classes from tree data
        const state = getTreeState(treeKind);
        const leafNodes = state.treeData ? state.treeData.filter(node => node.is_leaf) : [];
        return [...new Set(leafNodes.map((l) => l.class_label || "unknown"))].sort();
    }
}

// Blocks-specific metrics functions
export function calculateTreeMetrics(allPaths, SETTINGS, instancePath, treeKind) {
    if (treeKind === "blocks") {
        return calculateBlocksMetrics(allPaths, SETTINGS, instancePath);
    } else {
        console.warn("calculateTreeMetrics is blocks-specific, use calculateMetrics for other trees");
        return null;
    }
}

export function depthAlignedLayout(allPaths, SETTINGS, instancePath, metrics, treeKind) {
    if (treeKind !== "blocks") {
        console.warn("depthAlignedLayout is blocks-specific");
        return null;
    }

    const positions = {};

    const effectiveWidth = Math.max(SETTINGS.size.width, metrics.requiredWidth);
    const effectiveHeight = Math.max(SETTINGS.size.height, metrics.requiredHeight);

    const margin = {
        top: SETTINGS.margin.top * metrics.nodeScaleFactor,
        right: SETTINGS.margin.right * metrics.nodeScaleFactor,
        bottom: SETTINGS.margin.bottom * metrics.nodeScaleFactor,
        left: SETTINGS.margin.left * metrics.nodeScaleFactor,
    };

    const availableWidth = effectiveWidth - margin.left - margin.right;
    const availableHeight = effectiveHeight - margin.top - margin.bottom;

    const depthToX = {};
    for (let depth = 0; depth <= metrics.maxDepth; depth++) {
        depthToX[depth] =
            margin.left +
            (metrics.maxDepth === 0 ? 0 : depth * (availableWidth / metrics.maxDepth));
    }

    // Position instance path at the bottom
    const bottomY = effectiveHeight - margin.bottom;
    instancePath.forEach((nodeId, depth) => {
        positions[nodeId] = {
            id: nodeId,
            x: depthToX[depth],
            y: bottomY,
            label: getNodeLabel(nodeId, blocksTreeState.instanceData),
        };
    });

    // Other paths
    const otherPaths = [];
    for (const p of allPaths)
        if (!arraysEqual(p, instancePath)) otherPaths.push(p);

    const sortedOtherPaths = otherPaths.sort(
        (a, b) =>
            findBranchPoint(a, instancePath) - findBranchPoint(b, instancePath)
    );
    const availableSpaceAbove = availableHeight - margin.bottom * 2;
    const pathSpacing = Math.max(
        metrics.nodeSpacing,
        availableSpaceAbove / Math.max(1, sortedOtherPaths.length)
    );

    sortedOtherPaths.forEach((path, idx) => {
        const y = margin.top + idx * pathSpacing;
        path.forEach((nodeId, depth) => {
            if (!positions[nodeId]) {
                positions[nodeId] = {
                    id: nodeId,
                    x: depthToX[depth],
                    y,
                    label: getNodeLabel(nodeId, blocksTreeState.instanceData),
                };
            }
        });
    });

    return { positions, width: effectiveWidth, height: effectiveHeight };
}

// Helper functions for blocks layout
function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

function findBranchPoint(path, instancePath) {
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) branchPoint = i;
        else break;
    }
    return branchPoint;
}

function getNodeLabel(nodeId, instance) {
    // Import from blocks node helpers
    const getNodeLabelLines = function(nodeId, instance) {
        const state = getTreeState("blocks");
        const node = state.hierarchyRoot;
        
        // Simple implementation - can be enhanced
        if (!node) return [`Node ${nodeId}`];
        
        // Find node by DFS
        function findNode(currentNode) {
            if (currentNode.data.node_id === nodeId) return currentNode.data;
            if (currentNode.children) {
                for (const child of currentNode.children) {
                    const found = findNode(child);
                    if (found) return found;
                }
            }
            return null;
        }
        
        const nodeData = findNode(node);
        if (!nodeData) return [`Node ${nodeId}`];

        if (nodeData.is_leaf) {
            return [nodeData.class_label || "Unknown"];
        }
        const th = Number(nodeData.threshold) ?? 0;
        return [
            `${nodeData.feature_name} ≤ ${Number.isFinite(th) ? th.toFixed(3) : th}`,
            `Instance: ${instance?.[nodeData.feature_name]}`,
        ];
    };
    
    const lines = getNodeLabelLines(nodeId, instance);
    return lines.join("\n");
}