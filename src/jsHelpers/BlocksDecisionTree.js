import { state } from "./BlocksDecisionTreeHelpers/state_blocksTree.js";
import { buildHierarchy, traceInstancePath, getAllPathsFromHierarchy } from "./BlocksDecisionTreeHelpers/dataProcessing_blocksTree.js";
import { createSVGContainer } from "./BlocksDecisionTreeHelpers/svg_blocksTree.js";
import { setupZoom } from "./BlocksDecisionTreeHelpers/zoom_blocksTree.js";
import { depthAlignedLayout } from "./BlocksDecisionTreeHelpers/layout_blocksTree.js";
import { createLinks, renderLinks } from "./BlocksDecisionTreeHelpers/link_blocksTree.js";
import { 
    getNodeLabel, 
    getNodeLabelLines, 
    createTooltip, 
    showTooltip, 
    hideTooltip,
    handleNodeClick,
    getNodeById
} from "./BlocksDecisionTreeHelpers/node_blocksTree.js";
import { calculateFontSize } from "./BlocksDecisionTreeHelpers/utils_blocksTree.js";
import { CONTAINER_WIDTH, CONTAINER_HEIGHT, RECT_WIDTH, RECT_HEIGHT, SPLIT_NODE_COLOR } from "./BlocksDecisionTreeHelpers/settings_blocksTree.js";
import {
    getScatterPlotVisualization,
    getTreeVisualization,
    setBlocksTreeVisualization,
    getNodeColor,
} from "./visualizationConnector.js";
import { getGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";

export function createBlocksTreeVisualization(rawTreeData, instance) {
    // Set container selector
    const containerSelector = "#blocks-tree-plot";
    let tooltip = createTooltip();
    
    // Store the data
    state.treeData = rawTreeData;
    state.instanceData = instance;
    
    state.hierarchyRoot = buildHierarchy(rawTreeData);
    
    // Get the existing container - it should always exist in the HTML
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Container ${containerSelector} not found in DOM`);
        return;
    }

    // Clear any existing content
    container.innerHTML = '';
    
    // Ensure the entire visualization chain is visible
    ensureVisualizationVisibility();

    const visualization = render(containerSelector, tooltip);
    
    // Set the blocks tree visualization for interaction
    setBlocksTreeVisualization(visualization);
    
    return visualization;
}

function ensureVisualizationVisibility() {
    // Make sure the entire parent chain is visible
    const svgContainer = document.getElementById("svg-container");
    const blocksTreeContainer = document.getElementById("blocks-tree-plot");
    
    if (svgContainer) {
        svgContainer.style.display = "block";
        svgContainer.style.visibility = "visible";
    }
    
    if (blocksTreeContainer) {
        blocksTreeContainer.style.display = "block";
        blocksTreeContainer.style.visibility = "visible";
    }
}

function render(containerSelector, tooltip) {
    // Get paths and layout
    const instancePath = traceInstancePath(state.instanceData);
    const allPaths = getAllPathsFromHierarchy();

    const {
        positions: nodePositions,
        width: effectiveWidth,
        height: effectiveHeight,
    } = depthAlignedLayout(
        allPaths,
        CONTAINER_WIDTH,
        CONTAINER_HEIGHT,
        instancePath,
        getNodeLabel
    );

    // Create SVG
    const { svg, g } = createSVGContainer(
        containerSelector, 
        effectiveWidth, 
        effectiveHeight
    );

    // Setup zoom
    setupZoom(svg, g);

    // Render links
    const links = createLinks(allPaths, nodePositions);
    const linkElements = renderLinks(g, links, instancePath);

    // Render nodes
    const nodeElements = renderNodes(g, nodePositions, instancePath, tooltip);

    // Render labels
    renderLabels(g, nodePositions);

    // Return visualization object for interaction
    return {
        svg,
        container: g,
        nodePositions,
        links,
        instancePath,
        linkElements,
        nodeElements,
        allPaths
    };
}

// Helper function to get node color using global color management
function getBlocksNodeColor(nodeId) {
    const nodeData = getNodeById(nodeId);
    if (!nodeData) return SPLIT_NODE_COLOR;
    
    // Get the global color map
    const globalColorMap = getGlobalColorMap();
    if (!globalColorMap) return SPLIT_NODE_COLOR;
    
    // Create a node object that matches the global getNodeColor function interface
    const nodeForColorFunction = {
        data: nodeData
    };
    
    // Use the global getNodeColor function
    return getNodeColor(nodeForColorFunction, globalColorMap);
}

function renderNodes(container, nodePositions, instancePath, tooltip) {
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
        .attr("x", (d) => d.x - RECT_WIDTH / 2)
        .attr("y", (d) => d.y - RECT_HEIGHT / 2)
        .attr("width", RECT_WIDTH)
        .attr("height", RECT_HEIGHT)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", (d) => getBlocksNodeColor(d.id))
        .on("mouseover", (event, d) => {
            showTooltip(event, d.id, tooltip);
        })
        .on("mouseout", () => {
            hideTooltip(tooltip);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY - 28}px`);
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

function renderLabels(container, nodePositions) {
    const nodes = Object.values(nodePositions);

    container
        .selectAll(".node-label-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-label-group")
        .each(function (d) {
            const group = d3.select(this);
            const lines = getNodeLabelLines(d.id, state.instanceData);
            const fontSize = calculateFontSize(lines, RECT_WIDTH, RECT_HEIGHT);
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