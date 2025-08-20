import { state } from "./state_blocksTree.js";
import { getNodeById, getAllNodes, getAllLeaves } from "./node_blocksTree.js";

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