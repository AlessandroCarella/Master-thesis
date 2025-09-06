import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { spawnTreeState } from "../TreesCommon/state.js";
import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

function createSplitPath({ source, target }) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    
    const isSourceInPath = source.isInPath;
    
    if (isSourceInPath) {
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    } else {
        const midY = (sourceY + targetY) / 2;
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY =
            midY -
            Math.abs(targetX - sourceX) * Math.tan(TREES_SETTINGS.tree.radianAngle / 2);
        return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
    }
}

function determineLinkColor(sourceNodeId, targetNodeId) {
    if (!spawnTreeState.treeData) {
        return colorScheme.ui.linkStroke;
    }
    
    const sourceNode = spawnTreeState.treeData.find(node => node.node_id === sourceNodeId);
    
    if (!sourceNode || sourceNode.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    // Determine if link goes to left (false) or right (true) child
    if (targetNodeId === sourceNode.left_child) {
        return colorScheme.ui.falseLink; // Red for false path
    } else if (targetNodeId === sourceNode.right_child) {
        return colorScheme.ui.trueLink; // Green for true path
    }
    
    return colorScheme.ui.linkStroke; // fallback
}

export function addLinks(contentGroup, treeData, metrics) {
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    contentGroup
        .selectAll(".link")
        .data(visibleLinks, d => `${d.source.data.node_id}-${d.target.data.node_id}`)
        .join("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            const totalSamples = spawnTreeState.treeData ? spawnTreeState.treeData[0].n_samples : d.target.data.n_samples;
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples || d.target.data.n_samples, 
                totalSamples, 
                metrics.linkStrokeWidth,
                TREES_SETTINGS.treeKindID.spawn
            );
            const linkColor = determineLinkColor(d.source.data.node_id, d.target.data.node_id);
            
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
            d3.select(this).attr("data-original-stroke-color", linkColor);
        })
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .style("stroke", function(d) {
            return d3.select(this).attr("data-original-stroke-color");
        })
        .attr("d", (d) => createSplitPath(d))
        .style("fill", "none")
        .style("opacity", colorScheme.opacity.default);
}

export function addInstancePathBackgroundDirect(treeSpawnVis, instancePath) {
    if (!treeSpawnVis || !treeSpawnVis.container || !treeSpawnVis.treeData || !treeSpawnVis.metrics) {
        console.warn("TreeSpawn visualization not properly initialized, cannot add instance path background");
        return;
    }
    
    const { container, treeData, metrics } = treeSpawnVis;
    
    container.selectAll(".instance-path-background").remove();
    
    if (!instancePath || instancePath.length === 0) return;
    
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    const instancePathLinks = visibleLinks.filter(link => {
        const sourceId = link.source.data.node_id;
        const targetId = link.target.data.node_id;
        
        for (let i = 0; i < instancePath.length - 1; i++) {
            if (instancePath[i] === sourceId && instancePath[i + 1] === targetId) {
                return true;
            }
        }
        return false;
    });
    
    container
        .selectAll(".instance-path-background")
        .data(instancePathLinks)
        .join("path")
        .attr("class", "instance-path-background")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            const ratio = (d.target.data.weighted_n_samples || d.target.data.n_samples) / treeData.data.n_samples;
            const originalStrokeWidth = ratio * 3 * metrics.linkStrokeWidth;
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
        })
        .style("stroke-width", function(d) {
            const originalWidth = d3.select(this).attr("data-original-stroke-width");
            return `${originalWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`;
        })
        .attr("d", (d) => {
            const { x: sourceX, y: sourceY } = d.source;
            const { x: targetX, y: targetY } = d.target;
            return `M${sourceX},${sourceY} L${targetX},${targetY}`;
        })
        .style("fill", "none")
        .style("stroke", colorScheme.ui.instancePathHighlight)
        .style("opacity", colorScheme.opacity.originalInstancePath)
        .lower();
}
