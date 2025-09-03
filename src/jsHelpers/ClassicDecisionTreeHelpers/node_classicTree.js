import { colorScheme, getNodeColor } from "../visualizationConnectorHelpers/colors.js";
import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

export function addNodes(contentGroup, treeData, metrics, tooltip, colorMap) {
    // Get feature mapping info for tooltip
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    
    const nodes = contentGroup
        .selectAll(".node")
        .data(treeData.descendants())
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
        .append("circle")
        .attr("r", (d) => metrics.nodeRadius)
        .style("fill", (d) => getNodeColor(d, colorMap))
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("stroke", colorScheme.ui.nodeStroke)
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, TREES_SETTINGS.treeKindID.classic, featureMappingInfo)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(tooltip)
        )
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        });

    return nodes;
}

// Updated click handler using new coordination system
function handleNodeClick(event, d) {
    event.stopPropagation();

    const nodeId = d.data.node_id;
    const isLeaf = d.data.is_leaf;

    // Use the new central highlighting coordination function
    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'classic');
}
