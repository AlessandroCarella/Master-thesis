import { getTreeState } from "./state.js";
import { blocksTreeState } from "./state.js";
import { traceInstancePath } from "./dataProcessing.js";
import { createLinearPathLayout } from "../TreeSpawnDecisionTreeHelpers/subtrees_spawnTree.js";
import { TREES_SETTINGS, calculateSeparation } from "./settings.js";

export function calculateMetrics(root, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return calculateBlocksMetrics(root);
    } else {
        return calculateStandardMetrics(root);
    }
}

function calculateStandardMetrics(root) {
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
                TREES_SETTINGS.node.baseRadius,
                TREES_SETTINGS.node.minRadius,
                TREES_SETTINGS.node.maxRadius
            );
        },
        get depthSpacing() {
            return TREES_SETTINGS.size.innerHeight / (maxDepth + 1);
        },
        get treeWidth() {
            return this.depthSpacing * (maxDepth + 1);
        },
        get linkStrokeWidth() {
            return calculateLogScale(
                this.totalNodes,
                TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth,
                TREES_SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                TREES_SETTINGS.node.maxLinkAndNodeBorderStrokeWidth
            );
        },
        get nodeBorderStrokeWidth() {
            return this.linkStrokeWidth;
        },
    };
}

function calculateBlocksMetrics(allPaths) {
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
            return TREES_SETTINGS.layout.minSpacing * this.nodeScaleFactor;
        },
        get requiredWidth() {
            return (this.maxDepth + 1) * this.nodeSpacing * 2;
        },
        get requiredHeight() {
            return allPaths.length * this.nodeSpacing * TREES_SETTINGS.layout.scaleFactorMultiplier;
        },
        get linkStrokeWidth() {
            return Math.max(
                TREES_SETTINGS.node.minLinkAndNodeBorderStrokeWidth,
                Math.min(
                    TREES_SETTINGS.node.maxLinkAndNodeBorderStrokeWidth,
                    TREES_SETTINGS.node.baseLinkAndNodeBorderStrokeWidth * Math.sqrt(this.totalNodes / 30)
                )
            );
        },
    };
}

export function createTreeLayout(metrics, root, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.spawn) {
        // Get instance path from spawnTreeState or trace it
        const state = getTreeState(treeKind);
        let instancePath = state.instancePath;
        if (!instancePath || instancePath.length === 0) {
            instancePath = traceInstancePath();
        }

        // Return a function that applies the linear path layout
        return function(rootNode) {
            return createLinearPathLayout(rootNode, metrics, instancePath);
        };
    } 
    // Standard D3 tree layout for classic trees
    const horizontalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitWidth;
    const verticalSpacing = root.descendants().length * TREES_SETTINGS.tree.minSplitHeight;

    return d3.tree()
        .size([horizontalSpacing, verticalSpacing])
        .separation((a, b) => calculateSeparation());
}

export function calculateInitialTransform(treeData) {
    // Use ALL nodes (including hidden ones for spawn) for calculating initial zoom
    const allNodes = treeData.descendants();
    const [minX, maxX] = d3.extent(allNodes, (d) => d.x);
    const [minY, maxY] = d3.extent(allNodes, (d) => d.y);

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = TREES_SETTINGS.size.innerWidth / treeWidth;
    const scaleY = TREES_SETTINGS.size.innerHeight / treeHeight;
    const k = Math.min(scaleX, scaleY);

    const translateX =
        (TREES_SETTINGS.size.innerWidth - treeWidth * k) / 2 -
        minX * k +
        TREES_SETTINGS.margin.left;
    const translateY =
        (TREES_SETTINGS.size.innerHeight - treeHeight * k) / 2 -
        minY * k +
        TREES_SETTINGS.margin.top;

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

// Blocks-specific metrics functions
export function calculateTreeMetrics(allPaths, treeKind) {
    if (treeKind === TREES_SETTINGS.treeKindID.blocks) {
        return calculateBlocksMetrics(allPaths);
    } else {
        console.warn("calculateTreeMetrics is blocks-specific, use calculateMetrics for other trees");
        return null;
    }
}

export function depthAlignedLayout(allPaths, instancePath, metrics, treeKind) {
    if (treeKind !== TREES_SETTINGS.treeKindID.blocks) {
        console.warn("depthAlignedLayout is blocks-specific");
        return null;
    }

    const positions = {};

    const effectiveWidth = Math.max(TREES_SETTINGS.size.width, metrics.requiredWidth);
    const effectiveHeight = Math.max(TREES_SETTINGS.size.height, metrics.requiredHeight);

    const margin = {
        top: TREES_SETTINGS.margin.top * metrics.nodeScaleFactor,
        right: TREES_SETTINGS.margin.right * metrics.nodeScaleFactor,
        bottom: TREES_SETTINGS.margin.bottom * metrics.nodeScaleFactor,
        left: TREES_SETTINGS.margin.left * metrics.nodeScaleFactor,
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

function getNodeLabel(nodeId, instance) {
    // Import from blocks node helpers
    const getNodeLabelLines = function(nodeId, instance) {
        const state = getTreeState(TREES_SETTINGS.treeKindID.blocks);
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

function findBranchPoint(path, instancePath) {
    if (!path || !instancePath) return 0;
    
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) {
            branchPoint = i;
        } else {
            break;
        }
    }
    
    return branchPoint;
}