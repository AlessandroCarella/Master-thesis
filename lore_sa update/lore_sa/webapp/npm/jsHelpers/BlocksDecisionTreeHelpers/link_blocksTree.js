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

function determineLinkColor(sourceId, targetId) {
    if (!blocksTreeState.treeData) {
        return colorScheme.ui.linkStroke;
    }
    
    const sourceNode = blocksTreeState.treeData.find(node => node.node_id === sourceId);
    
    if (!sourceNode || sourceNode.is_leaf) {
        return colorScheme.ui.linkStroke;
    }
    
    // Determine if link goes to left (false) or right (true) child
    if (targetId === sourceNode.left_child) {
        return colorScheme.ui.falseLink; // Red for false path
    } else if (targetId === sourceNode.right_child) {
        return colorScheme.ui.trueLink; // Green for true path
    }
    
    return colorScheme.ui.linkStroke; // fallback
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
        .each(function(d) {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const targetNode = processor.getNodeById(d.targetId);
            const linkColor = determineLinkColor(d.sourceId, d.targetId);
            
            if (!targetNode) {
                d3.select(this).attr("data-original-stroke-width", 1);
            } else {
                const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
                const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
                const strokeWidth = getStrokeWidth(samples, totalSamples, 3, TREES_SETTINGS.treeKindID.blocks);
                d3.select(this).attr("data-original-stroke-width", strokeWidth);
            }
            
            d3.select(this).attr("data-original-stroke-color", linkColor);
        })
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .style("stroke", function(d) {
            return d3.select(this).attr("data-original-stroke-color");
        });
}
