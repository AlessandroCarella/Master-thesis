import { getStrokeWidth } from "./metrics_spawnTree.js";
import { colorScheme } from "../visualizationConnector.js";

export function createSplitPath({ source, target }, SETTINGS) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    
    // For the linear path layout, we want different link styles
    const isSourceInPath = source.isInPath;
    const isTargetInPath = target.isInPath;
    
    if (isSourceInPath) {
        // Direct horizontal line for path connections
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
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

// Add only normal links (no automatic background highlights)
export function addLinks(contentGroup, treeData, metrics, SETTINGS, instancePath = []) {
    // Only create links between visible nodes
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    // Add normal links (no automatic background highlights)
    // Background highlights will only be added when explicitly requested
    contentGroup
        .selectAll(".link")
        .data(visibleLinks, d => `${d.source.data.node_id}-${d.target.data.node_id}`)
        .join("path")
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
        })
        .style("stroke-width", function(d) {
            // Use normal stroke width for regular links
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .attr("d", (d) => createSplitPath(d, SETTINGS))
        .style("fill", "none")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("opacity", colorScheme.opacity.default);
}

// Helper function to update instance path background highlights
export function updateInstancePathBackground(contentGroup, treeData, metrics, SETTINGS, instancePath = []) {
    // Remove existing background highlights
    contentGroup.selectAll(".instance-path-background").remove();
    
    // Re-add background highlights with new instance path
    if (instancePath && instancePath.length > 0) {
        const visibleLinks = treeData.links().filter(link => 
            !link.source.isHidden && !link.target.isHidden
        );
        const instancePathLinks = visibleLinks.filter(link => isLinkInPath(link, instancePath));
        
        contentGroup
            .selectAll(".instance-path-background")
            .data(instancePathLinks)
            .enter()
            .append("path")
            .attr("class", "instance-path-background")
            .attr("data-source-id", (d) => d.source.data.node_id)
            .attr("data-target-id", (d) => d.target.data.node_id)
            .each(function(d) {
                const originalStrokeWidth = getStrokeWidth(
                    d.target.data.weighted_n_samples || d.target.data.n_samples, 
                    treeData.data.n_samples, 
                    metrics.linkStrokeWidth
                );
                d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
            })
            .style("stroke-width", function(d) {
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth * (SETTINGS.visual.strokeWidth.pathHighlightMultiplier || 2)}px`;
            })
            .attr("d", (d) => createSplitPath(d, SETTINGS))
            .style("fill", "none")
            .style("stroke", colorScheme.ui.instancePathHighlight)
            .style("opacity", colorScheme.opacity.originalInstancePath)
            .lower();
    }
}

// Function to highlight specific links (for interactive highlighting)
export function highlightTreeSpawnLinks(contentGroup, linkPairs, metrics) {
    linkPairs.forEach(pair => {
        contentGroup
            .selectAll(".link")
            .filter((d) => {
                return (d.source.data.node_id === pair.source && d.target.data.node_id === pair.target) ||
                       (d.source.data.node_id === pair.target && d.target.data.node_id === pair.source);
            })
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth}px`; // Moderate highlight for interactive selection
            });
    });
}

// Function to reset interactive link highlights (keeps instance path background)
export function resetTreeSpawnLinkHighlights(contentGroup) {
    // Reset interactive highlights on normal links
    contentGroup
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        });
    
    // Keep instance path background highlights as they are persistent
    // No changes needed to .instance-path-background elements
}

// Function to completely remove instance path background (for reset scenarios)
export function removeInstancePathBackground(contentGroup) {
    contentGroup.selectAll(".instance-path-background").remove();
}