import {
    colorScheme,
    getBlocksTreeVisualization,
    getNodeColor,
    getScatterPlotVisualization,
    getTreeSpawnVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
} from "../visualizationConnector.js";
import { calculateNodeRadius } from "./metrics_spawnTree.js";
import { state } from "./state_spawnTree.js";
import { isNodeInPath, getInstanceValue } from "./dataProcessing_spawnTree.js";
import { createContextMenu } from "./contextMenu_spawnTree.js"

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap
) {
    // Get instance path from state
    const instancePath = state.instancePath || [];
    const instanceData = state.instanceData;
    
    const visibleNodes = treeData.descendants().filter(d => !d.isHidden);
    
    const nodes = contentGroup
        .selectAll(".node")
        .data(visibleNodes, d => d.data.node_id)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add different shapes based on whether node is in path
    nodes.each(function(d) {
        const isInPath = isNodeInPath(d.data.node_id, instancePath);
        const element = d3.select(this);
        
        // Clear any existing shapes
        element.selectAll('*').remove();
        
        if (isInPath) {
            // Rectangle for path nodes
            element.append("rect")
                .attr("x", -SETTINGS.visual.rectWidth / 2)
                .attr("y", -SETTINGS.visual.rectHeight / 2)
                .attr("width", SETTINGS.visual.rectWidth)
                .attr("height", SETTINGS.visual.rectHeight)
                .attr("rx", SETTINGS.visual.rectBorderRadius)
                .attr("ry", SETTINGS.visual.rectBorderRadius)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);

            // Add text for path nodes
            const textLines = getNodeTextLines(d, instanceData);
            const fontSize = calculateFontSize(textLines, SETTINGS.visual.rectWidth, SETTINGS.visual.rectHeight);
            const lineHeight = fontSize * 1.2;
            
            const totalTextHeight = textLines.length * lineHeight;
            const startY = -(totalTextHeight / 2) + (lineHeight / 2);
            
            textLines.forEach((line, index) => {
                const yPos = startY + (index * lineHeight);
                
                element.append("text")
                    .attr("x", 0)
                    .attr("y", yPos)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", `${fontSize}px`)
                    .text(line);
            });
        } else {
            // Circle for non-path nodes
            element.append("circle")
                .attr("r", calculateNodeRadius(d, metrics))
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);
            
            // Add indicator if node has hidden children
            if (d.hasHiddenChildren) {
                element.append("text")
                    .attr("x", 0)
                    .attr("y", 5)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", "12px")
                    .style("font-weight", "bold")
                    .style("fill", "#333")
                    .style("pointer-events", "none")
                    .text("...");
            }
        }
    });

    // Add event handlers
    nodes.selectAll("circle, rect")
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics)
        )
        .on("click", (event, d) => {
            handleNodeClick(event, d, contentGroup);
        })
        .on("contextmenu", (event, d) => {
            if (d.hasHiddenChildren || d.isExpanded) {
                createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);
            }
        });

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics) {
    const content = createNodeTooltipContent(d);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

function createNodeTooltipContent(d) {
    const content = [];

    // Node type and primary information
    if (d.data.is_leaf) {
        content.push(`<strong>Class:</strong> ${d.data.class_label}`);
    } else {
        content.push(
            `<strong>Split:</strong> ${
                d.data.feature_name
            } â‰¤ ${d.data.threshold.toFixed(2)}`
        );
        content.push(`<strong>Feature Index:</strong> ${d.data.feature_index}`);
        content.push(`<strong>Impurity:</strong> ${d.data.impurity.toFixed(4)}`);
    }

    // Common information for both node types
    content.push(`<strong>Samples:</strong> ${d.data.n_samples}`);

    // Add weighted samples if available
    if (d.data.weighted_n_samples) {
        const weightDiff = Math.abs(
            d.data.weighted_n_samples - d.data.n_samples
        );
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${d.data.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    // Add subtree information
    if (d.hasHiddenChildren) {
        content.push(`<strong>Subtree:</strong> Right-click to expand`);
    } else if (d.isExpanded) {
        content.push(`<strong>Subtree:</strong> Right-click to collapse`);
    }

    return content;
}

export function handleMouseMove(event, tooltip) {
    tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
}

export function handleMouseOut(event, d, tooltip, metrics) {
    tooltip.style("visibility", "hidden");
    d3.select(event.currentTarget)
        .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
        .style("opacity", colorScheme.opacity.hover);
}

// Handle node clicks - integration with global highlighting system
function handleNodeClick(event, spawnNodeData, container) {
    event.stopPropagation();

    // Get all tree visualizations
    const blocksTreeVis = getBlocksTreeVisualization();
    const spawnTreeVis = getTreeSpawnVisualization();
    const treeVis = getTreeVisualization();
    const scatterPlotVis = getScatterPlotVisualization();
    
    // Create mock metrics for compatibility
    const mockMetrics = {
        nodeBorderStrokeWidth: 2,
        linkStrokeWidth: 2
    };

    // Find corresponding node in classic tree hierarchy
    const hierarchicalNode = findClassicTreeHierarchyNode(spawnNodeData.data.node_id);
    
    if (!hierarchicalNode) {
        console.warn(`Could not find classic tree node with ID: ${spawnNodeData.data.node_id}`);
        return;
    }

    const classicalTreeContainer = treeVis ? treeVis.contentGroup : null;

    // Use existing tree node click handler
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

// Helper function to find hierarchy node by ID in the classic tree
function findClassicTreeHierarchyNode(nodeId) {
    const treeVis = getTreeVisualization();
    if (!treeVis || !treeVis.treeData) return null;

    const descendants = treeVis.treeData.descendants();
    return descendants.find(node => node.data.node_id === nodeId);
}

// Calculate optimal font size for multi-line labels inside a rectangle
function calculateFontSize(lines, rectWidth, rectHeight) {
    const padding = 10;
    const lineHeight = 1.2;
    const charWidthRatio = 0.6;
    
    const availableWidth = rectWidth - padding * 2;
    const availableHeight = rectHeight - padding * 2;

    const maxTextLength = Math.max(
        ...lines.map((line) => (line ?? "").toString().length)
    );
    
    const fontSizeBasedOnWidth = availableWidth / Math.max(1, maxTextLength * charWidthRatio);
    const fontSizeBasedOnHeight = availableHeight / Math.max(1, lines.length * lineHeight);

    let fontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);
    fontSize = Math.max(8, Math.min(20, fontSize));
    
    return fontSize;
}

// Function to prepare text lines for a node
function getNodeTextLines(d, instanceData) {
    const lines = [];
    
    if (!d.data.is_leaf) {
        // Decision node - show split condition and instance value
        const featureName = d.data.feature_name || 'Unknown';
        const threshold = d.data.threshold !== undefined ? d.data.threshold.toFixed(2) : 'N/A';
        const instanceValue = getInstanceValue(featureName, instanceData);
        
        lines.push(`${featureName} â‰¤ ${threshold}`);
        
        if (instanceValue !== null && instanceValue !== undefined) {
            const formattedValue = typeof instanceValue === 'number' ? instanceValue.toFixed(2) : instanceValue;
            lines.push(`Instance: ${formattedValue}`);
        }
    } else {
        // Leaf node - show class label
        lines.push(`${d.data.class_label}`);
    }
    
    return lines;
}

// Helper functions for highlighting - FIXED VERSION
export function highlightTreeSpawnNode(visualization, nodeId) {
    // Get the TreeSpawn visualization if not provided
    const treeSpawnVis = visualization || getTreeSpawnVisualization();
    
    if (!treeSpawnVis || !treeSpawnVis.container) {
        console.warn("TreeSpawn visualization not available for highlighting");
        return;
    }

    // Use the container from the visualization object
    const contentGroup = treeSpawnVis.container;
    
    contentGroup
        .selectAll(".node")
        .filter((d) => d.data.node_id === nodeId)
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", "3px");
}

export function resetTreeSpawnNodeHighlights(visualization) {
    // Get the TreeSpawn visualization if not provided
    const treeSpawnVis = visualization || getTreeSpawnVisualization();
    
    if (!treeSpawnVis || !treeSpawnVis.container) {
        console.warn("TreeSpawn visualization not available for resetting highlights");
        return;
    }

    // Use the container from the visualization object
    const contentGroup = treeSpawnVis.container;
    
    contentGroup
        .selectAll(".node")
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", "2px");
}

export function highlightTreeSpawnPath(visualization, pathNodeIds) {
    // Get the TreeSpawn visualization if not provided
    const treeSpawnVis = visualization || getTreeSpawnVisualization();
    
    if (!treeSpawnVis || !treeSpawnVis.container || !pathNodeIds) {
        console.warn("TreeSpawn visualization or path data not available for highlighting");
        return;
    }

    pathNodeIds.forEach(nodeId => {
        highlightTreeSpawnNode(treeSpawnVis, nodeId);
    });
}

export function highlightTreeSpawnDescendants(visualization, nodeId) {
    // Get the TreeSpawn visualization if not provided
    const treeSpawnVis = visualization || getTreeSpawnVisualization();
    
    if (!treeSpawnVis || !treeSpawnVis.container || !state.hierarchyRoot) {
        console.warn("TreeSpawn visualization or hierarchy data not available for highlighting descendants");
        return;
    }

    // Find all descendant node IDs
    const descendants = [];
    
    function collectDescendants(node) {
        descendants.push(node.node_id);
        if (node.children) {
            node.children.forEach(child => collectDescendants(child));
        }
    }

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

    const startNode = findNode(state.hierarchyRoot, nodeId);
    if (startNode) {
        collectDescendants(startNode);
        
        descendants.forEach(descendantId => {
            highlightTreeSpawnNode(treeSpawnVis, descendantId);
        });
    }
}

// Function to find TreeSpawn path for given features (similar to blocks tree)
export function findTreeSpawnPath(features) {
    const treeSpawnVis = getTreeSpawnVisualization();
    if (!treeSpawnVis || !treeSpawnVis.treeData) {
        console.warn("TreeSpawn visualization or tree data not available");
        return [];
    }

    try {
        // Find the root node in the TreeSpawn hierarchy
        const root = treeSpawnVis.treeData.descendants().find(node => node.depth === 0);
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
    } catch (error) {
        console.error("Error finding TreeSpawn path:", error);
        return [];
    }
}

// Function to highlight TreeSpawn path from scatter plot (similar to blocks tree)
export function highlightTreeSpawnPathFromScatterPlot(path) {
    const treeSpawnVis = getTreeSpawnVisualization();
    if (!treeSpawnVis || !path || path.length === 0) {
        return;
    }

    try {
        // Reset previous highlights first
        resetTreeSpawnHighlights(treeSpawnVis);

        // Highlight nodes in the path
        path.forEach((node) => {
            treeSpawnVis.container
                .selectAll(".node")
                .filter((d) => d.data.node_id === node.data.node_id)
                .selectAll("circle, rect")
                .style("stroke", colorScheme.ui.highlight)
                .style("stroke-width", "3px");
        });

        // Highlight links in the path
        for (let i = 0; i < path.length - 1; i++) {
            const currentNode = path[i];
            const nextNode = path[i + 1];

            treeSpawnVis.container
                .selectAll(".link")
                .filter((linkData) => {
                    return (linkData.source.data.node_id === currentNode.data.node_id && 
                            linkData.target.data.node_id === nextNode.data.node_id) ||
                           (linkData.source.data.node_id === nextNode.data.node_id && 
                            linkData.target.data.node_id === currentNode.data.node_id);
                })
                .style("stroke", colorScheme.ui.highlight)
                .style("stroke-width", function(d) {
                    const originalWidth = d3.select(this).attr("data-original-stroke-width");
                    // Fallback to metrics if attribute doesn't exist
                    if (originalWidth && originalWidth !== null) {
                        return `${originalWidth}px`;
                    } else {
                        // Use fallback stroke width from metrics
                        const fallbackWidth = treeSpawnVis.metrics ? treeSpawnVis.metrics.linkStrokeWidth : 2;
                        return `${fallbackWidth}px`;
                    }
                });
        }
    } catch (error) {
        console.error("Error highlighting TreeSpawn path:", error);
    }
}

// Helper function to reset TreeSpawn highlights (needed by the highlighting functions above)
function resetTreeSpawnHighlights(treeSpawnVis) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Reset node highlights
    treeSpawnVis.container
        .selectAll(".node")
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", "2px");

    // Reset link highlights
    treeSpawnVis.container
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        });
}