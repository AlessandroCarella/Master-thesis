import {
    colorScheme,
    getBlocksTreeVisualization,
    getNodeColor,
    getScatterPlotVisualization,
    getTreeSpawnVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
} from "../visualizationConnector.js";
import { calculateNodeRadius } from "../TreesCommon/metrics.js";
import { classicTreeState } from "../TreesCommon/state.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltip.js";

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
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
        .attr("r", (d) => calculateNodeRadius(d, metrics))
        .style("fill", (d) => getNodeColor(d, colorMap))
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("stroke", colorScheme.ui.nodeStroke)
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, "classic")
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, "classic")
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

// Helper function to highlight a specific node
export function highlightClassicTreeNode(contentGroup, nodeId) {
    if (!contentGroup) return;

    contentGroup
        .selectAll(".node")
        .filter((d) => d.data.node_id === nodeId)
        .select("circle")
        .style("stroke", colorScheme.ui.highlight)
}

// Helper function to reset node highlights
export function resetClassicTreeNodeHighlights(contentGroup) {
    if (!contentGroup) return;

    contentGroup
        .selectAll(".node circle")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", function() {
            // Get the metrics from the stored tree visualization
            const treeVis = getTreeVisualization();
            return `${treeVis.metrics.nodeBorderStrokeWidth}px`
        });
}

// Helper function to highlight a path in classic tree
export function highlightClassicTreePath(contentGroup, pathNodeIds) {
    if (!contentGroup || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightClassicTreeNode(contentGroup, nodeId);
    });
}

// Helper function to highlight descendants of a node
export function highlightClassicTreeDescendants(contentGroup, nodeId) {
    if (!contentGroup || !classicTreeState.hierarchyRoot) return;

    // Find all descendant node IDs
    const descendants = [];
    
    function collectDescendants(node) {
        descendants.push(node.node_id);
        if (node.children) {
            node.children.forEach(child => collectDescendants(child));
        }
    }

    // Find the starting node in the hierarchy
    function findNode(node, targetId) {
        if (node.node_id === targetId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = findNode(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }

    const startNode = findNode(classicTreeState.hierarchyRoot, nodeId);
    if (startNode) {
        collectDescendants(startNode);
        
        // Highlight all descendant nodes
        descendants.forEach(descendantId => {
            highlightClassicTreeNode(contentGroup, descendantId);
        });
    }
}