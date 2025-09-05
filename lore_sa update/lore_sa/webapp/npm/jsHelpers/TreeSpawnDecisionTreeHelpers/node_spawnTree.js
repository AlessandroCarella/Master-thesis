import {
    colorScheme,
    getNodeColor,
} from "../visualizationConnectorHelpers/colors.js";
import { coordinateHighlightingAcrossAllTrees } from "../visualizationConnectorHelpers/HighlightingCoordinator.js";
import { spawnTreeState } from "../TreesCommon/state.js";
import { createContextMenu } from "./contextMenu_spawnTree.js"
import { handleMouseOver, handleMouseMove, handleMouseOut } from "../TreesCommon/tooltipTrees.js";
import { TreeDataProcessorFactory } from "../visualizationConnectorHelpers/TreeDataProcessor.js";
import { calculateFontSize, TREES_SETTINGS } from "../TreesCommon/settings.js";
import { FeatureDecoder } from "../visualizationConnectorHelpers/featureDecoder.js";

function getSpawnNodeTextLines(nodeData, featureMappingInfo = null) {
    if (!nodeData) return ['Unknown Node'];

    // Handle both direct data and d3 hierarchy structure
    const data = nodeData.data || nodeData;

    if (data.is_leaf) {
        return [data.class_label];
    }
    
    const encodedFeatureName = data.feature_name;
    const threshold = data.threshold;
    
    if (!encodedFeatureName || threshold === undefined) {
        return ['Internal Node'];
    }
    
    // Create decoder for split condition
    const originalInstance = window.currentOriginalInstance || {};
    const decoder = new FeatureDecoder(featureMappingInfo, originalInstance);
    
    try {
        // Use decoder to create human-readable split condition
        const decodedCondition = decoder.decodeTreeSplitCondition(encodedFeatureName, threshold, true);
        return [decodedCondition];
        
    } catch (error) {
        console.warn("Error decoding node text for spawn tree:", error);
        
        // Fallback to encoded display
        const thresholdStr = Number.isFinite(threshold) ? threshold.toFixed(1) : threshold;
        return [`${encodedFeatureName} ≤ ${thresholdStr}`];
    }
}

function getNodeTextLines(nodeData) {
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    return getSpawnNodeTextLines(nodeData, featureMappingInfo);
}

// Helper function to check if node is in path using new processor
function isNodeInPath(nodeId, instancePath) {
    const processor = TreeDataProcessorFactory.create(TREES_SETTINGS.treeKindID.spawn);
    return processor.isNodeInPath(nodeId, instancePath);
}

export function addNodes(
    contentGroup,
    treeData,
    metrics,
    tooltip,
    colorMap
) {
    // Get instance path from spawnTreeState
    const instancePath = spawnTreeState.instancePath || [];
    const instanceData = spawnTreeState.instanceData;
    
    // Get feature mapping info for tooltip
    const featureMappingInfo = window.currentFeatureMappingInfo || null;
    
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
                .attr("x", -TREES_SETTINGS.visual.rectWidth / 2)
                .attr("y", -TREES_SETTINGS.visual.rectHeight / 2)
                .attr("width", TREES_SETTINGS.visual.rectWidth)
                .attr("height", TREES_SETTINGS.visual.rectHeight)
                .attr("rx", TREES_SETTINGS.visual.rectBorderRadius)
                .attr("ry", TREES_SETTINGS.visual.rectBorderRadius)
                .style("fill", getNodeColor(d, colorMap))
                .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`)
                .style("stroke", colorScheme.ui.nodeStroke)
                .style("opacity", colorScheme.opacity.default);

            // Add text for path nodes using simplified text generation
            const textLines = getNodeTextLines(d);
            const fontSize = calculateFontSize(textLines);
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
                .attr("r", metrics.nodeRadius)
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

    nodes.selectAll("circle, rect")
        .on("mouseover", (event, d) =>
            handleMouseOver(event, d, tooltip, TREES_SETTINGS.treeKindID.spawn, featureMappingInfo)
        )
        .on("mousemove", (event) => handleMouseMove(event, tooltip))
        .on("mouseout", () =>
            handleMouseOut(tooltip)
        )
        .on("click", (event, d) => {
            handleNodeClick(event, d);
        })
        .on("contextmenu", (event, d) => {
            if (d.hasHiddenChildren || d.isExpanded) {
                createContextMenu(event, d, contentGroup, treeData, metrics, tooltip, colorMap);
            }
        });

    return nodes;
}

// Updated click handler using new coordination system
function handleNodeClick(event, spawnNodeData) {
    event.stopPropagation();

    const nodeId = spawnNodeData.data.node_id;
    const isLeaf = spawnNodeData.data.is_leaf;

    // Use the central highlighting coordination function
    coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, 'spawn');
}
