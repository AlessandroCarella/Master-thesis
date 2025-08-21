import { calculateNodeRadius } from "./metrics_spawnTree.js";
import { isNodeInPath, getInstanceValue } from "./instancePath_spawnTree.js";
import { handleMouseOver, handleMouseMove, handleMouseOut } from "./tooltip_spawnTree.js";
import { createContextMenu } from "./contextMenu_spawnTree.js";

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

    // Add common event handlers to both circles and rectangles
    nodes.selectAll("circle, rect")
        .attr("data-in-path", (d) => isNodeInPath(d.data.node_id, instancePath))
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, metrics, instancePath, SETTINGS)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", (event, d) =>
            handleMouseOut(event, d, tooltip, metrics, instancePath, SETTINGS)
        );

    // Add context menu only to nodes that can be expanded or collapsed
    nodes.selectAll("circle, rect")
        .filter(d => d.hasHiddenChildren || d.isExpanded)
        .on("contextmenu", (event, d) => 
            createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData)
        );

    return nodes;
}