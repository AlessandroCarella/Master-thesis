import { state } from "./state_blocksTree.js";
import { getNodeById, getAllNodes, getAllLeaves, getNodeLabel } from "./node_blocksTree.js";

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

export function calculateTreeMetrics(allPaths, SETTINGS, instancePath) {
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

// Depth-aligned layout that lines up nodes by depth and allocates space by total node count
export function depthAlignedLayout(allPaths, SETTINGS, instancePath, metrics) {
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
            label: getNodeLabel(nodeId, state.instanceData),
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
                    label: getNodeLabel(nodeId, state.instanceData),
                };
            }
        });
    });

    return { positions, width: effectiveWidth, height: effectiveHeight };
}

export function getTreeDepth() {
    return state.hierarchyRoot ? state.hierarchyRoot.height : 0;
}

export function getClassDistribution(leaves) {
    const dist = {};
    leaves.forEach((leaf) => {
        const cls = leaf.class_label || "unknown";
        dist[cls] = (dist[cls] || 0) + 1;
    });
    return dist;
}

export function getTreeStats() {
    if (!state.hierarchyRoot) return {};
    const allNodes = getAllNodes();
    const leaves = getAllLeaves();
    return {
        totalNodes: allNodes.length,
        leafNodes: leaves.length,
        internalNodes: allNodes.length - leaves.length,
        maxDepth: getTreeDepth(),
        classDistribution: getClassDistribution(leaves),
    };
}

export function getUniqueClasses() {
    const leaves = getAllLeaves();
    return [...new Set(leaves.map((l) => l.class_label || "unknown"))].sort();
}

export function getStrokeWidth(targetNodeId) {
    const targetNode = getNodeById(targetNodeId);    
    const totalSamples = state.treeData[0].n_samples;

    const ratio = targetNode.weighted_n_samples / totalSamples;
    const strokeWidth = ratio * 3 * totalSamples / 30;

    return strokeWidth;
}