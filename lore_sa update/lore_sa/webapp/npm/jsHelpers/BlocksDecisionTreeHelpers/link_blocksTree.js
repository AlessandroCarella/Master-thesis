import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { colorScheme } from "../visualizationConnectorHelpers/colors.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { blocksTreeState } from "../TreesCommon/state.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

export function createLinks(allPaths, nodePositions) {
    const links = [];
    const added = new Set();

    allPaths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
            const sourceId = path[i];
            const targetId = path[i + 1];
            const id = `${sourceId}-${targetId}`;
            if (!added.has(id)) {
                added.add(id);
                links.push({
                    source: nodePositions[sourceId],
                    target: nodePositions[targetId],
                    sourceId,
                    targetId,
                });
            }
        }
    });

    return links;
}

function isLinkHighlighted(link, instancePath) {
    const sIdx = instancePath.indexOf(link.sourceId);
    const tIdx = instancePath.indexOf(link.targetId);
    return sIdx !== -1 && tIdx !== -1 && Math.abs(sIdx - tIdx) === 1;
}

export function renderLinks(container, links, instancePath) {
    return container
        .selectAll(".link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", (d) => `link ${isLinkHighlighted(d, instancePath) ? "highlighted" : ""}`)
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", (d) => {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const targetNode = processor.getNodeById(d.targetId);
            if (!targetNode) return "1px";
            
            const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
            const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
            
            return `${getStrokeWidth(samples, totalSamples, 3, TREES_SETTINGS.treeKindID.blocks)}px`;
        })
        .each(function(d) {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const targetNode = processor.getNodeById(d.targetId);
            if (targetNode) {
                const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
                const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
                const strokeWidth = getStrokeWidth(samples, totalSamples, 3, TREES_SETTINGS.treeKindID.blocks);
                d3.select(this).attr("data-original-stroke-width", strokeWidth);
            } else {
                d3.select(this).attr("data-original-stroke-width", 1);
            }
        });
}
