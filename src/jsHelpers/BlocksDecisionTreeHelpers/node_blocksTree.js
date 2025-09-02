import { blocksTreeState } from "../TreesCommon/state.js";
import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { colorScheme, getGlobalColorMap, getNodeColor } from "../visualizationConnectorHelpers/colors.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltip.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { calculateFontSize, TREES_SETTINGS } from "../TreesCommon/settings.js";
import { 
    getNodeLabelLines,
    getFeatureMappingInfo
} from "../visualizationConnectorHelpers/encoding_decoding.js";

function getNodeLabelLinesForBlocks(nodeId) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const node = processor.getNodeById(nodeId);
    const featureMappingInfo = getFeatureMappingInfo();
    
    if (!node) return [`Node ${nodeId}`];
    
    return getNodeLabelLines(node, featureMappingInfo);
}

// Helper function to get node color using global color management
function getBlocksNodeColor(nodeId) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const nodeData = processor.getNodeById(nodeId);
    if (!nodeData) return colorScheme.ui.nodeStroke;
    
    // Get the global color map
    const globalColorMap = getGlobalColorMap();
    if (!globalColorMap) return colorScheme.ui.nodeStroke;
    
    // Create a node object that matches the global getNodeColor function interface
    const nodeForColorFunction = {
        data: nodeData
    };
    
    // Use the global getNodeColor function
    return getNodeColor(nodeForColorFunction, globalColorMap);
}

export function renderNodes(container, nodePositions, instancePath, tooltip) {
    const nodes = Object.values(nodePositions);

    const nodeElements = container
        .selectAll(".node")
        .data(nodes)
        .enter()
        .append("rect")
        .attr(
            "class",
            (d) => `node ${instancePath.includes(d.id) ? "highlighted" : ""}`
        )
        .attr("x", (d) => d.x - TREES_SETTINGS.node.width / 2)
        .attr("y", (d) => d.y - TREES_SETTINGS.node.height / 2)
        .attr("width", TREES_SETTINGS.node.width)
        .attr("height", TREES_SETTINGS.node.height)
        .attr("rx", TREES_SETTINGS.node.borderRadius)
        .attr("ry", TREES_SETTINGS.node.borderRadius)
        .attr("fill", (d) => getBlocksNodeColor(d.id))
        .on("mouseover", (event, d) => {
            const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
            const nodeData = processor.getNodeById(d.id);
            handleMouseOver(event, nodeData, tooltip, TREES_SETTINGS.treeKindID.blocks, getFeatureMappingInfo());
        })
        .on("mousemove", (event) => {
            handleMouseMove(event, tooltip);
        })
        .on("mouseout", (event, d) => {
            handleMouseOut(tooltip);
        })
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        });

    return nodeElements;
}

export function renderLabels(container, nodePositions) {
    const nodes = Object.values(nodePositions);

    container
        .selectAll(".node-label-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-label-group")
        .each(function (d) {
            const group = d3.select(this);
            const lines = getNodeLabelLinesForBlocks(d.id);
            const fontSize = calculateFontSize(lines);
            const lineHeight = fontSize * 1.2;

            lines.forEach((line, idx) => {
                group
                    .append("text")
                    .attr("class", "node-label")
                    .attr("x", d.x)
                    .attr(
                        "y",
                        d.y + (idx - (lines.length - 1) / 2) * lineHeight
                    )
                    .style("font-size", `${fontSize}px`)
                    .text(line);
            });
        });
}

// Updated click handler using new coordination system
function handleNodeClick(event, blocksNodeData) {
    event.stopPropagation();

    const nodeId = blocksNodeData.id;
    
    // Get node data to determine if it's a leaf using new processor
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.blocks);
    const nodeData = processor.getNodeById(nodeId);
    const isLeaf = nodeData ? nodeData.is_leaf : false;

    // Use the central highlighting coordination function
    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'blocks');
}
