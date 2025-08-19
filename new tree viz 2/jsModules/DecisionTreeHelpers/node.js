import { calculateNodeRadius } from "./metrics.js";
import { expandSubtree, collapseSubtree } from "./subtrees.js";

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
        return colorMap[d.data.class_label] || SETTINGS.visual.colors.nodeDefaultLeaf;
    }
    return SETTINGS.visual.colors.nodeDefault; // Default for non-leaf nodes
}

// Helper function to check if a node is in the instance path
function isNodeInPath(nodeId, instancePath) {
    return instancePath && instancePath.includes(nodeId);
}

// Function to get instance value for a feature
function getInstanceValue(featureName, instanceData) {
    if (!instanceData || !featureName) return null;
    return instanceData[featureName];
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

// Create and show context menu
function createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData) {
    // Remove any existing context menu
    d3.select('.context-menu').remove();
    
    // Prevent default context menu
    event.preventDefault();
    event.stopPropagation();
    
    // Only show context menu for nodes that have hidden children
    if (!d.hasHiddenChildren && !d.isExpanded) {
        return;
    }
    
    const menu = d3.select('body')
        .append('div')
        .attr('class', 'context-menu')
        .style('position', 'absolute')
        .style('left', (event.pageX + 5) + 'px')
        .style('top', (event.pageY + 5) + 'px');
    
    if (d.hasHiddenChildren) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .text('Expand Subtree')
            .on('click', () => {
                expandSubtree(d);
                refreshVisualization(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);
                d3.select('.context-menu').remove();
            });
    }
    
    if (d.isExpanded) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .text('Collapse Subtree')
            .on('click', () => {
                collapseSubtree(d);
                refreshVisualization(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData);
                d3.select('.context-menu').remove();
            });
    }
    
    // Add click listener to document to close menu
    const closeMenu = () => {
        d3.select('.context-menu').remove();
        d3.select('body').on('click.context-menu', null);
    };
    
    // Use a small delay to prevent immediate closing
    setTimeout(() => {
        d3.select('body').on('click.context-menu', closeMenu);
    }, 10);
}

// Function to refresh the visualization after expand/collapse
function refreshVisualization(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData) {
    // Import the refreshVisualization function from DecisionTree.js
    import('../DecisionTree.js').then(module => {
        module.refreshVisualization();
    });
}

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
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth * SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                .style("stroke", SETTINGS.visual.colors.pathHighlightStroke)
                .style("opacity", SETTINGS.visual.opacity.pathHighlight);

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
                    .style("font-weight", index === 0 ? "bold" : "normal")
                    .style("fill", index === 0 ? "#333" : "#666")
                    .text(line);
            });
        } else {
            // Circle for non-path nodes
            const circle = element.append("circle")
                .attr("r", baseRadius)
                .style("fill", getNodeColor(d, colorMap, SETTINGS))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", SETTINGS.visual.colors.nodeStroke)
                .style("opacity", SETTINGS.visual.opacity.normal);
            
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

    // Add event handlers to both circles and rectangles
    nodes.selectAll("circle, rect")
        .attr("data-in-path", (d) => isNodeInPath(d.data.node_id, instancePath))
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("contextmenu", (event, d) => 
            createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData)
        );

    return nodes;
}

export function handleMouseOver(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    // Extract tooltip content creation to a separate function
    const content = createNodeTooltipContent(d, instancePath);

    tooltip
        .html(content.join("<br>"))
        .style("class", "decision-tree-tooltip")
        .style("visibility", "visible")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");

    d3.select(event.currentTarget).style("stroke", SETTINGS.visual.colors.highlight);
}

function createNodeTooltipContent(d, instancePath = []) {
    const content = [];

    // Node type and primary information
    if (d.data.is_leaf) {
        // Leaf node information
        content.push(`<strong>Class:</strong> ${d.data.class_label}`);
    } else {
        // Split node information
        content.push(
            `<strong>Split:</strong> ${
                d.data.feature_name
            } ≤ ${d.data.threshold.toFixed(2)}`
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
        // Only show if there's a meaningful difference
        if (weightDiff > 0.01) {
            content.push(
                `<strong>Weighted Samples:</strong> ${d.data.weighted_n_samples.toFixed(
                    2
                )}`
            );
        }
    }

    if (!d.data.is_leaf) {
        // Add class distribution if available (summarized)
        if (d.data.value && d.data.value.length > 0 && d.data.value[0].length > 0) {
            const valueArray = d.data.value[0];
            if (valueArray.length > 1) {
                const total = valueArray.reduce((sum, val) => sum + val, 0);
                const distribution = valueArray
                    .map((val) => ((val / total) * 100).toFixed(1) + "%")
                    .join(", ");
                content.push(
                    `<strong>Class Distribution:</strong> [${distribution}]`
                );
            }
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

export function handleMouseOut(event, d, tooltip, metrics, instancePath = [], SETTINGS) {
    tooltip.style("visibility", "hidden");
    
    const isInPath = isNodeInPath(d.data.node_id, instancePath);
    const strokeColor = isInPath ? SETTINGS.visual.colors.pathHighlightStroke : SETTINGS.visual.colors.nodeStroke;
    const strokeWidth = isInPath ? `${metrics.nodeBorderStrokeWidth * SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px` : `${metrics.nodeBorderStrokeWidth}px`;
    const opacity = isInPath ? SETTINGS.visual.opacity.pathHighlight : SETTINGS.visual.opacity.normal;
    
    d3.select(event.currentTarget)
        .style("stroke", strokeColor)
        .style("stroke-width", strokeWidth)
        .style("opacity", opacity);
}