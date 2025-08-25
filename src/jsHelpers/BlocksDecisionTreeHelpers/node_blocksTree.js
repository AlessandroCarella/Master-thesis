import { blocksTreeState } from "../TreesCommon/state.js"
import { 
    handleTreeNodeClick,
    colorScheme,
    getBlocksTreeVisualization,
    getTreeVisualization,
    getScatterPlotVisualization,
    getTreeSpawnVisualization,
    getNodeColor,
} from "../visualizationConnector.js";
import { getGlobalColorMap } from "../visualizationConnectorHelpers/colors.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltip.js";
import { getNodeById } from "../TreesCommon/dataProcessing.js";
import { calculateFontSize, TREES_SETTINGS } from "../TreesCommon/settings.js";

export function getNodeLabelLines(nodeId, instance) {
    const node = getNodeById(nodeId, "blocks");
    if (!node) return [`Node ${nodeId}`];

    if (node.is_leaf) {
        return [node.class_label || "Unknown"];
    }
    const th = Number(node.threshold) ?? 0;
    return [
        `${node.feature_name} ≤ ${Number.isFinite(th) ? th.toFixed(3) : th}`,
        `Instance: ${instance?.[node.feature_name]}`,
    ];
}

export function getNodeLabel(nodeId, instance) {
    const lines = getNodeLabelLines(nodeId, instance);
    return lines.join("\n");
}

// Helper function to get node color using global color management
function getBlocksNodeColor(nodeId) {
    const nodeData = getNodeById(nodeId, "blocks");
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
            handleMouseOver(event, getNodeById(d.id, "blocks"), tooltip, null, "blocks");
        })
        .on("mousemove", (event) => {
            handleMouseMove(event, tooltip);
        })
        .on("mouseout", (event, d) => {
            handleMouseOut(event, d, tooltip, "blocks");
        })
        .on("click", (event, d) => {
            handleNodeClick(
                event,
                d,
                container,
                getTreeVisualization(),
                getScatterPlotVisualization()
            );
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
            const lines = getNodeLabelLines(d.id, blocksTreeState.instanceData);
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

// FIXED: Helper function to find hierarchy node by ID in the CLASSIC TREE
function findClassicTreeHierarchyNode(nodeId) {
    const treeVis = getTreeVisualization();
    if (!treeVis || !treeVis.treeData) return null;

    // Search in the classic tree hierarchy
    const descendants = treeVis.treeData.descendants();
    return descendants.find(node => node.data.node_id === nodeId);
}

// Helper function to find hierarchy node by ID in the BLOCKS TREE (for internal blocks tree operations)
function findBlocksTreeHierarchyNode(nodeId) {
    const root = blocksTreeState.hierarchyRoot;
    if (!root) return null;

    function search(node) {
        if (node.data.node_id === nodeId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = search(child);
                if (found) return found;
            }
        }
        return null;
    }

    return search(root);
}

// Handle node clicks in the blocks tree - FIXED VERSION
function handleNodeClick(event, blocksNodeData, container, treeVis, scatterPlotVis) {
    event.stopPropagation();

    // Get the other tree visualizations
    const blocksTreeVis = getBlocksTreeVisualization();
    const spawnTreeVis = getTreeSpawnVisualization();
    
    // Create a mock metrics object for the highlighting system
    const mockMetrics = {
        nodeBorderStrokeWidth: 2,
        linkStrokeWidth: 2
    };

    // FIXED: Find the corresponding node in the CLASSIC tree hierarchy
    const hierarchicalNode = findClassicTreeHierarchyNode(blocksNodeData.id);
    
    if (!hierarchicalNode) {
        console.warn(`Could not find classic tree node with ID: ${blocksNodeData.id}`);
        return;
    }

    const classicalTreeContainer = treeVis ? treeVis.contentGroup : null;

    // Use the existing tree node click handler with blocks tree adaptation
    handleTreeNodeClick(
        event,
        hierarchicalNode,
        classicalTreeContainer,
        treeVis,
        scatterPlotVis,
        mockMetrics,
        blocksTreeVis,
        spawnTreeVis
    );
}

// Highlight a specific node in blocks tree
export function highlightBlocksTreeNode(blocksTreeVis, nodeId) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    blocksTreeVis.container
        .selectAll(".node")
        .filter((d) => d.id === nodeId)
        .style("stroke", colorScheme.ui.highlight)
}

// Highlight a path in blocks tree
export function highlightBlocksTreePath(blocksTreeVis, pathNodeIds) {
    if (!blocksTreeVis || !blocksTreeVis.container || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightBlocksTreeNode(blocksTreeVis, nodeId);
    });

    // Highlight links in the path
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const sourceId = pathNodeIds[i];
        const targetId = pathNodeIds[i + 1];

        blocksTreeVis.container
            .selectAll(".link")
            .filter((d) => {
                return (d.sourceId === sourceId && d.targetId === targetId) ||
                       (d.sourceId === targetId && d.targetId === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight);
    }
}

// Highlight descendants of a node (for split nodes)
export function highlightBlocksTreeDescendants(blocksTreeVis, nodeId) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    const node = getNodeById(nodeId, "blocks");
    if (!node) return;

    // Get all descendant node IDs using the blocks tree hierarchy
    const descendants = [];
    
    function collectDescendants(currentNodeId) {
        const currentNode = getNodeById(currentNodeId, "blocks");
        if (!currentNode) return;
        
        descendants.push(currentNodeId);
        
        // Find children in the blocks tree hierarchy
        const hierarchyNode = findBlocksTreeHierarchyNode(currentNodeId);
        if (hierarchyNode && hierarchyNode.children) {
            hierarchyNode.children.forEach(child => {
                collectDescendants(child.data.node_id);
            });
        }
    }

    collectDescendants(nodeId);

    // Highlight all descendant nodes
    descendants.forEach(descendantId => {
        highlightBlocksTreeNode(blocksTreeVis, descendantId);
    });

    // Highlight links between consecutive levels of descendants
    for (let i = 0; i < descendants.length; i++) {
        const currentId = descendants[i];
        const hierarchyNode = findBlocksTreeHierarchyNode(currentId);
        
        if (hierarchyNode && hierarchyNode.children) {
            hierarchyNode.children.forEach(child => {
                const childId = child.data.node_id;
                if (descendants.includes(childId)) {
                    blocksTreeVis.container
                        .selectAll(".link")
                        .filter((d) => {
                            return (d.sourceId === currentId && d.targetId === childId) ||
                                   (d.sourceId === childId && d.targetId === currentId);
                        })
                        .style("stroke", colorScheme.ui.highlight);
                }
            });
        }
    }
}

// Function to find tree path for scatter plot integration (similar to classical tree)
export function findBlocksTreePath(features) {
    const root = blocksTreeState.hierarchyRoot;
    if (!root) return [];

    let path = [];
    let currentNode = root;

    while (currentNode) {
        path.push(currentNode);

        // If we've reached a leaf node, stop
        if (currentNode.data.is_leaf) {
            break;
        }

        // Get the feature value for the current split
        const featureValue = features[currentNode.data.feature_name];

        // Decide which child to traverse to
        if (featureValue <= currentNode.data.threshold) {
            // Find left child
            currentNode = currentNode.children?.find(child => 
                child.data.node_id === currentNode.data.left_child
            ) || null;
        } else {
            // Find right child
            currentNode = currentNode.children?.find(child => 
                child.data.node_id === currentNode.data.right_child
            ) || null;
        }
    }

    return path;
}

// Function to highlight tree path in blocks tree (for scatter plot integration)
export function highlightBlocksTreePathFromScatterPlot(path) {
    const blocksTreeVis = getBlocksTreeVisualization();
    if (!blocksTreeVis) return;

    // Reset previous highlights first
    resetBlocksTreeHighlights(blocksTreeVis);

    // Highlight nodes in the path
    path.forEach((node) => {
        highlightBlocksTreeNode(blocksTreeVis, node.data.node_id);
    });

    // Highlight links in the path
    for (let i = 0; i < path.length - 1; i++) {
        const currentNode = path[i];
        const nextNode = path[i + 1];

        blocksTreeVis.container
            .selectAll(".link")
            .filter((linkData) => {
                return (linkData.sourceId === currentNode.data.node_id && 
                        linkData.targetId === nextNode.data.node_id) ||
                       (linkData.sourceId === nextNode.data.node_id && 
                        linkData.targetId === currentNode.data.node_id);
            })
            .style("stroke", colorScheme.ui.highlight);
    }
}

// Reset highlights for blocks tree
export function resetBlocksTreeHighlights(blocksTreeVis) {
    if (!blocksTreeVis || !blocksTreeVis.container) return;

    // Reset node highlights  
    blocksTreeVis.container
        .selectAll(".node")
        .style("stroke", "#666666")

    // Reset link highlights
    blocksTreeVis.container
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke);
}