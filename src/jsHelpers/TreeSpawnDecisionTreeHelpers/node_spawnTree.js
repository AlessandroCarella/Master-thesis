import { calculateNodeRadius } from "./metrics_spawnTree.js";
import { isNodeInPath, getInstanceValue } from "./instancePath_spawnTree.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "./tooltip_spawnTree.js";
import { createContextMenu } from "./contextMenu_spawnTree.js";
import { 
    handleTreeNodeClick,
    getTreeVisualization,
    getScatterPlotVisualization,
    getBlocksTreeVisualization,
    getTreeSpawnVisualization,
    colorScheme
} from "../visualizationConnector.js";
import { resetTreeSpawnHighlights } from "./highlight_spawnTree.js";

// Calculate optimal font size for multi-line labels inside a rectangle
function calculateFontSize(lines, rectWidth, rectHeight) {
    // Configuration constants
    const padding = 10;        // Inner padding from rectangle edges
    const lineHeight = 1.2;    // Line height multiplier (20% extra space between lines)
    const charWidthRatio = 0.6; // Estimated character width to font size ratio
    
    // Calculate available space after accounting for padding
    const availableWidth = rectWidth - padding * 2;
    const availableHeight = rectHeight - padding * 2;

    // Find the longest line to determine width constraints
    const maxTextLength = Math.max(
        ...lines.map((line) => (line ?? "").toString().length)
    );
    
    // Calculate font size based on width constraint
    // Assumes each character takes about 0.6 times the font size in width
    const fontSizeBasedOnWidth = availableWidth / Math.max(1, maxTextLength * charWidthRatio);
    
    // Calculate font size based on height constraint
    // Total height needed = number of lines * lineHeight * fontSize
    const fontSizeBasedOnHeight = availableHeight / Math.max(1, lines.length * lineHeight);

    // Use the smaller of the two constraints to ensure text fits in both dimensions
    let fontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);
    
    // Apply min/max bounds to keep text readable
    fontSize = Math.max(8, Math.min(20, fontSize));
    
    return fontSize;
}

// Function to get node color based on class
export function getNodeColor(d, colorMap, SETTINGS) {
    if (d.data.is_leaf && d.data.class_label !== undefined) {
        return colorMap[d.data.class_label];
    }
    // Use global color scheme for consistency
    return colorScheme.ui.default; // Default for non-leaf nodes
}

// Function to prepare text lines for a node
function getNodeTextLines(d, instanceData) {
    const lines = [];
    
    if (!d.data.is_leaf) {
        // Decision node - show split condition and instance value
        const featureName = d.data.feature_name || 'Unknown';
        const threshold = d.data.threshold !== undefined ? d.data.threshold.toFixed(2) : 'N/A';
        const instanceValue = getInstanceValue(featureName, instanceData);
        
        // Split condition line
        lines.push(`${featureName} ≤ ${threshold}`);
        
        // Instance value line (if available)
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

// Helper function to find hierarchy node by ID in the CLASSIC TREE
function findClassicTreeHierarchyNode(nodeId) {
    const treeVis = getTreeVisualization();
    if (!treeVis || !treeVis.treeData) return null;

    // Search in the classic tree hierarchy
    const descendants = treeVis.treeData.descendants();
    return descendants.find(node => node.data.node_id === nodeId);
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

// Handle node clicks in the TreeSpawn tree - proper integration with global highlighting
export function handleNodeClick(event, spawnNodeData, container, treeVis, scatterPlotVis) {
    event.stopPropagation();

    // Get all tree visualizations
    const blocksTreeVis = getBlocksTreeVisualization();
    const spawnTreeVis = getTreeSpawnVisualization();
    
    // Create a mock metrics object for the highlighting system (consistent with blocks tree)
    const mockMetrics = {
        nodeBorderStrokeWidth: 2,
        linkStrokeWidth: 2
    };

    // Find the corresponding node in the CLASSIC tree hierarchy
    const hierarchicalNode = findClassicTreeHierarchyNode(spawnNodeData.data.node_id);
    
    if (!hierarchicalNode) {
        console.warn(`Could not find classic tree node with ID: ${spawnNodeData.data.node_id}`);
        return;
    }

    const classicalTreeContainer = treeVis ? treeVis.contentGroup : null;

    // Use the existing tree node click handler with proper TreeSpawn integration
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

// Main function to add nodes with proper click handler integration
export function addNodes(
    contentGroup,
    treeData,
    metrics,
    SETTINGS,
    tooltip,
    colorMap,
    instancePath = [],
    instanceData = null
) {
    const visibleNodes = treeData.descendants().filter(d => !d.isHidden);
    
    const nodes = contentGroup
        .selectAll(".node")
        .data(visibleNodes, d => d.data.node_id) // Use key function for proper data binding
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add different shapes based on whether node is in path
    nodes.each(function(d) {
        const isInPath = isNodeInPath(d.data.node_id, instancePath);
        const baseRadius = calculateNodeRadius(d, metrics);
        const element = d3.select(this);
        
        // Clear any existing shapes
        element.selectAll('*').remove();
        
        if (isInPath) {
            // Rectangle for path nodes with settings-based dimensions
            element.append("rect")
                .attr("x", -SETTINGS.visual.rectWidth / 2)
                .attr("y", -SETTINGS.visual.rectHeight / 2)
                .attr("width", SETTINGS.visual.rectWidth)
                .attr("height", SETTINGS.visual.rectHeight)
                .attr("rx", SETTINGS.visual.rectBorderRadius)
                .attr("ry", SETTINGS.visual.rectBorderRadius)
                .style("fill", getNodeColor(d, colorMap, SETTINGS))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);

            // Add text for path nodes with dynamic font sizing and vertical centering
            const textLines = getNodeTextLines(d, instanceData);
            const fontSize = calculateFontSize(textLines, SETTINGS.visual.rectWidth, SETTINGS.visual.rectHeight);
            const lineHeight = fontSize * 1.2;
            
            // Calculate total text height and starting Y position for vertical centering
            const totalTextHeight = textLines.length * lineHeight;
            const startY = -(totalTextHeight / 2) + (lineHeight / 2);
            
            // Add each line of text
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
            const circle = element.append("circle")
                .attr("r", baseRadius)
                .style("fill", getNodeColor(d, colorMap, SETTINGS))
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

    // Add event handlers with proper click integration
    nodes.selectAll("circle, rect")
        .attr("data-in-path", (d) => isNodeInPath(d.data.node_id, instancePath))
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("click", (event, d) => {
            // Proper click handler integration
            handleNodeClick(
                event,
                d,
                contentGroup,
                getTreeVisualization(),
                getScatterPlotVisualization()
            );
        });

    // Add context menu only to nodes that can be expanded or collapsed
    nodes.selectAll("circle, rect")
        .filter(d => d.hasHiddenChildren || d.isExpanded)
        .on("contextmenu", (event, d) => 
            createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData)
        );

    return nodes;
}