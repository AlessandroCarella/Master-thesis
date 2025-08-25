import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { colorScheme } from "../visualizationConnector.js";
import { getNodeById } from "../TreesCommon/dataProcessing.js";
import { blocksTreeState } from "../TreesCommon/state.js";

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

export function isLinkHighlighted(link, instancePath) {
    const sIdx = instancePath.indexOf(link.sourceId);
    const tIdx = instancePath.indexOf(link.targetId);
    return sIdx !== -1 && tIdx !== -1 && Math.abs(sIdx - tIdx) === 1;
}

export function renderLinks(container, links, instancePath, SETTINGS) {
    return container
        .selectAll(".link")
        .data(links)
        .enter()
        .append("line")
        .attr(
            "class",
            (d) =>
                `link ${
                    isLinkHighlighted(d, instancePath) ? "highlighted" : ""
                }`
        )
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", (d) => {
            // Get the actual node data using targetId
            const targetNode = getNodeById(d.targetId, "blocks");
            if (!targetNode) return "1px";
            
            const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
            const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
            
            return `${getStrokeWidth(samples, totalSamples, 3, "blocks")}px`;
        })
        .each(function(d) {
            // Store original stroke width for highlighting
            const targetNode = getNodeById(d.targetId, "blocks");
            if (targetNode) {
                const samples = targetNode.weighted_n_samples || targetNode.n_samples || 1;
                const totalSamples = blocksTreeState.treeData ? blocksTreeState.treeData[0].n_samples : samples;
                const strokeWidth = getStrokeWidth(samples, totalSamples, 3, "blocks");
                d3.select(this).attr("data-original-stroke-width", strokeWidth);
            } else {
                d3.select(this).attr("data-original-stroke-width", 1);
            }
        });
}

// Highlight instance path in blocks tree (similar to classic tree)
export function highlightInstancePathInBlocks(container, pathNodeIds) {
    // Add validation for pathNodeIds
    if (!container || !pathNodeIds) {
        console.warn("Missing required parameters for highlightInstancePathInBlocks");
        return;
    }

    // Reset any existing path highlights
    container
        .selectAll(".link.instance-path")
        .classed("instance-path", false);
    container.selectAll(".link-highlight").remove();

    if (!pathNodeIds || pathNodeIds.length < 2) return;

    // Create an array of link identifiers (source-target pairs)
    const linkPairs = pathNodeIds.slice(0, -1).map((source, i) => ({
        source,
        target: pathNodeIds[i + 1],
    }));

    // Add highlights
    container
        .selectAll(".link")
        .filter((d) => {
            const sourceId = d.sourceId;
            const targetId = d.targetId;

            return linkPairs.some(
                (pair) => pair.source === sourceId && pair.target === targetId
            );
        })
        .each(function () {
            const originalLink = d3.select(this);
            const x1 = originalLink.attr("x1");
            const y1 = originalLink.attr("y1");
            const x2 = originalLink.attr("x2");
            const y2 = originalLink.attr("y2");
            
            container
                .append("line")
                .attr("class", "link-highlight")
                .attr("x1", x1)
                .attr("y1", y1)
                .attr("x2", x2)
                .attr("y2", y2)
                .style("stroke", colorScheme.ui.instancePathHighlight)
                .style("opacity", colorScheme.opacity.originalInstancePath)
                .style("stroke-width", `${d3.select(this).attr("data-original-stroke-width") * colorScheme.ui.strokeMultiplierInstancePath}px`)
                .lower();

            originalLink.classed("instance-path", true);
        });
}

// Reset all link highlights in blocks tree
export function resetBlocksLinkHighlights(container) {
    if (!container) return;

    // Remove any highlight overlays
    container.selectAll(".link-highlight").remove();
    
    // Reset link classes
    container
        .selectAll(".link.instance-path")
        .classed("instance-path", false);

    // Reset link styles
    container
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", function(d) {
            // Use the stored original stroke width
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        });
}

// Highlight specific links in blocks tree
export function highlightBlocksLinks(container, linkPairs) {
    if (!container || !linkPairs) return;

    linkPairs.forEach(pair => {
        container
            .selectAll(".link")
            .filter((d) => {
                return (d.sourceId === pair.source && d.targetId === pair.target) ||
                       (d.sourceId === pair.target && d.targetId === pair.source);
            })
            .style("stroke", colorScheme.ui.highlight);
    });
}

// Highlight path to root for leaf nodes (similar to classic tree functionality)
export function highlightPathToRootInBlocks(container, leafNodeId, allPaths) {
    if (!container || !leafNodeId || !allPaths) return;

    // Find the path that contains this leaf node
    const pathToRoot = allPaths.find(path => 
        path[path.length - 1] === leafNodeId
    );

    if (!pathToRoot) return;

    // Highlight all links in the path to root
    for (let i = 0; i < pathToRoot.length - 1; i++) {
        const sourceId = pathToRoot[i];
        const targetId = pathToRoot[i + 1];

        container
            .selectAll(".link")
            .filter((d) => {
                return (d.sourceId === sourceId && d.targetId === targetId) ||
                       (d.sourceId === targetId && d.targetId === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight);
    }
}

// Highlight descendant links for split nodes
export function highlightDescendantLinksInBlocks(container, nodeId, allPaths) {
    if (!container || !nodeId || !allPaths) return;

    // Find all paths that pass through this node
    const descendantPaths = allPaths.filter(path => path.includes(nodeId));
    
    // Collect all links in these paths that are descendants of the node
    const descendantLinks = new Set();
    
    descendantPaths.forEach(path => {
        const nodeIndex = path.indexOf(nodeId);
        if (nodeIndex !== -1) {
            // Add all links from this node onwards in the path
            for (let i = nodeIndex; i < path.length - 1; i++) {
                const sourceId = path[i];
                const targetId = path[i + 1];
                descendantLinks.add(`${sourceId}-${targetId}`);
            }
        }
    });

    // Highlight all descendant links
    descendantLinks.forEach(linkId => {
        const [sourceId, targetId] = linkId.split('-').map(id => parseInt(id));
        
        container
            .selectAll(".link")
            .filter((d) => {
                return (d.sourceId === sourceId && d.targetId === targetId) ||
                       (d.sourceId === targetId && d.targetId === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight);
    });
}