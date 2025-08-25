import {
    colorScheme,
    getBlocksTreeVisualization,
    getNodeColor,
    getScatterPlotVisualization,
    getTreeSpawnVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
} from "../visualizationConnector.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltip.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    tooltip,
    colorMap
) {
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
            handleMouseOver(event, d, tooltip, TREES_SETTINGS.treeKindID.classic)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(tooltip)
        );
        
    nodes.on("click", (event, d) => {
        // Get the other tree visualizations
        const blocksTreeVis = getBlocksTreeVisualization();
        const spawnTreeVis = getTreeSpawnVisualization();

        handleTreeNodeClick(
            event,
            d,
            contentGroup,
            getTreeVisualization(),
            getScatterPlotVisualization(),
            metrics,
            blocksTreeVis,
            spawnTreeVis
        );
    });

    return nodes;
}
