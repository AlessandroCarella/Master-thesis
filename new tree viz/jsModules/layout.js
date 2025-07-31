import { arraysEqual, findBranchPoint } from "./utils.js";
import { state } from "./state.js";

// Depth-aligned layout that lines up nodes by depth and allocates space by total node count
export function depthAlignedLayout(
    allPaths,
    width,
    height,
    instancePath,
    getNodeLabel
) {
    const positions = {};

    // Unique nodes count
    const allNodes = new Set();
    allPaths.forEach((path) => path.forEach((id) => allNodes.add(id)));
    const totalNodes = allNodes.size;

    const nodeScaleFactor = Math.max(1, Math.sqrt(totalNodes / 100));
    const minSpacing = 100;
    const nodeSpacing = minSpacing * nodeScaleFactor;

    const maxDepth = Math.max(...allPaths.map((p) => p.length - 1));
    const requiredWidth = (maxDepth + 1) * nodeSpacing * 2;
    const requiredHeight = allPaths.length * nodeSpacing * 1.5;

    const effectiveWidth = Math.max(width, requiredWidth);
    const effectiveHeight = Math.max(height, requiredHeight);

    const margin = {
        top: 100 * nodeScaleFactor,
        right: 100 * nodeScaleFactor,
        bottom: 100 * nodeScaleFactor,
        left: 100 * nodeScaleFactor,
    };

    const availableWidth = effectiveWidth - margin.left - margin.right;
    const availableHeight = effectiveHeight - margin.top - margin.bottom;

    const depthToX = {};
    for (let depth = 0; depth <= maxDepth; depth++) {
        depthToX[depth] =
            margin.left +
            (maxDepth === 0 ? 0 : depth * (availableWidth / maxDepth));
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
        nodeSpacing,
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
