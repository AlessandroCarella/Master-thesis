import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { classicTreeState } from "../TreesCommon/state.js";
import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

function createSplitPath({ source, target }) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    const midY = (sourceY + targetY) / 2;
    const controlX = sourceX + (targetX - sourceX) / 2;
    const controlY =
        midY -
        Math.abs(targetX - sourceX) * Math.tan(TREES_SETTINGS.tree.radianAngle / 2);

    return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
}

function determineLinkColor(sourceNode, targetNodeId) {
    if (!sourceNode || !sourceNode.data) {
        return colorScheme.ui.linkStroke; // fallback
    }
    
    const sourceData = sourceNode.data;
    
    // If source is a leaf, use default color
    if (sourceData.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    // Determine if link goes to left (false) or right (true) child
    if (targetNodeId === sourceData.left_child) {
        return colorScheme.ui.falseLink; // Red for false path
    } else if (targetNodeId === sourceData.right_child) {
        return colorScheme.ui.trueLink; // Green for true path
    }
    
    return colorScheme.ui.linkStroke; // fallback
}

export function addLinks(contentGroup, treeData, metrics) {
    contentGroup
        .selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            const totalSamples = classicTreeState.treeData ? classicTreeState.treeData[0].n_samples : d.target.data.n_samples;
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples, 
                totalSamples, 
                metrics.linkStrokeWidth,
                TREES_SETTINGS.treeKindID.classic
            );
            const linkColor = determineLinkColor(d.source, d.target.data.node_id);
            
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
        .style("fill", "none");
}

export function highlightInstancePath(contentGroup, pathNodeIds) {
    // If no pathNodeIds provided, calculate using new processor
    if (!pathNodeIds && classicTreeState.instanceData && classicTreeState.hierarchyRoot) {
        const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.classic);
        pathNodeIds = processor.findInstancePath(classicTreeState.instanceData);
    }

    if (!contentGroup || !pathNodeIds) {
        console.warn("Missing required parameters for highlightInstancePath");
        return;
    }

    // Reset any existing path highlights
    contentGroup
        .selectAll(".link.instance-path")
        .classed("instance-path", false);
    contentGroup.selectAll(".link-highlight").remove();

    if (!pathNodeIds || pathNodeIds.length < 2) return;

    const linkPairs = pathNodeIds.slice(0, -1).map((source, i) => ({
        source,
        target: pathNodeIds[i + 1],
    }));

    contentGroup
        .selectAll(".link")
        .filter((d) => {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;
            return linkPairs.some(pair => pair.source === sourceId && pair.target === targetId);
        })
        .each(function () {
            const originalPath = d3.select(this);
            const pathD = originalPath.attr("d");
            const baseStrokeWidth = parseFloat(originalPath.attr("data-original-stroke-width"));

            contentGroup
                .append("path")
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", colorScheme.ui.instancePathHighlight)
                .style("stroke-width", `${baseStrokeWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                .style("fill", "none")
                .style("opacity", colorScheme.opacity.originalInstancePath)
                .lower();

            originalPath.classed("instance-path", true);
        });
}
