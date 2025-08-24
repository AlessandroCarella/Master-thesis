import { expandSubtree, collapseSubtree } from "./subtrees_spawnTree.js";
import { refreshVisualization } from "../TreeSpawnDecisionTree.js";
import { addNodes } from "./node_spawnTree.js";
import { addLinks } from "./link_spawnTree.js";
import { getGlobalColorMap } from "../visualizationConnectorHelpers/colors.js";

// Create and show context menu
export function createContextMenu(event, d, contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap, instancePath, instanceData) {
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
        .style('top', (event.pageY + 5) + 'px')
        .style('background', 'white')
        .style('border', '1px solid #ccc')
        .style('box-shadow', '2px 2px 5px rgba(0,0,0,0.2)')
        .style('padding', '5px 0')
        .style('min-width', '120px')
        .style('z-index', '1000');
    
    if (d.hasHiddenChildren) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .style('padding', '8px 15px')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .text('Expand Subtree')
            .on('mouseover', function() {
                d3.select(this).style('background-color', '#f0f0f0');
            })
            .on('mouseout', function() {
                d3.select(this).style('background-color', 'transparent');
            })
            .on('click', () => {
                expandSubtree(d);                
                updateNodesAndLinks(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap);
                d3.select('.context-menu').remove();
            });
    }
    
    if (d.isExpanded) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .style('padding', '8px 15px')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .text('Collapse Subtree')
            .on('mouseover', function() {
                d3.select(this).style('background-color', '#f0f0f0');
            })
            .on('mouseout', function() {
                d3.select(this).style('background-color', 'transparent');
            })
            .on('click', () => {
                collapseSubtree(d);                
                updateNodesAndLinks(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap);
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

function updateNodesAndLinks(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap) {
    // Completely recreate nodes to handle newly visible ones
    // Remove all existing nodes first
    contentGroup.selectAll(".node").remove();
    contentGroup.selectAll(".link").remove();
    
    // Recreate all visible nodes and links
    addLinks(contentGroup, treeData, metrics, SETTINGS);
    addNodes(contentGroup, treeData, metrics, SETTINGS, tooltip, colorMap || getGlobalColorMap());
}