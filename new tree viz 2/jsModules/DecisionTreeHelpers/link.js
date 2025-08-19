// link.js - Updated for Linear Path Layout
import { getStrokeWidth } from "./metrics.js";

// Color scheme for the visualization
const colorScheme = {
    ui: {
        linkStroke: '#999',
        highlightStroke: '#ff4444',
        highlightStrokeWidth: 4
    }
};

export function createSplitPath({ source, target }, SETTINGS) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    
    // For the linear path layout, we want different link styles
    const isSourceInPath = source.isInPath;
    const isTargetInPath = target.isInPath;
    
    if (isSourceInPath && isTargetInPath) {
        // Direct horizontal line for path connections
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    } else if (isSourceInPath && !isTargetInPath) {
        // Vertical connection from path node to off-path subtree
        const midX = sourceX + (targetX - sourceX) * 0.5;
        const midY = sourceY + (targetY - sourceY) * 0.3;
        return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
    } else {
        // Standard curved connection for off-path subtrees
        const midY = (sourceY + targetY) / 2;
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY =
            midY -
            Math.abs(targetX - sourceX) * Math.tan(SETTINGS.tree.radianAngle / 2);
        return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
    }
}

// Helper function to check if a link is in the instance path
function isLinkInPath(link, instancePath) {
    if (!instancePath || instancePath.length === 0) return false;
    
    const sourceId = link.source.data.node_id;
    const targetId = link.target.data.node_id;
    
    // Check if both source and target are consecutive in the path
    for (let i = 0; i < instancePath.length - 1; i++) {
        if (instancePath[i] === sourceId && instancePath[i + 1] === targetId) {
            return true;
        }
    }
    return false;
}

export function addLinks(contentGroup, treeData, metrics, SETTINGS, instancePath = []) {
    contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            // Calculate and store the original stroke width based on samples
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples || d.target.data.n_samples, 
                treeData.data.n_samples, 
                metrics.linkStrokeWidth
            );
            // Store as data attribute for later retrieval
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
            
            // Check if this link is in the instance path
            const isInPath = isLinkInPath(d, instancePath);
            d3.select(this).attr("data-in-path", isInPath);
        })
        .style("stroke-width", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            if (isInPath) {
                return `${colorScheme.ui.highlightStrokeWidth}px`;
            }
            // Use the stored original stroke width
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .attr("d", (d) => createSplitPath(d, SETTINGS))
        .style("fill", "none")
        .style("stroke", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            return isInPath ? colorScheme.ui.highlightStroke : colorScheme.ui.linkStroke;
        })
        .style("opacity", 1);
}