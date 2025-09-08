/**
 * @fileoverview Context menu utilities for TreeSpawn visualization allowing dynamic subtree expansion and collapse
 * @module contextMenu_spawnTree
 * @author Generated documentation
 */

import { expandSubtree, collapseSubtree } from "./subtrees_spawnTree.js";
import { addNodes } from "./node_spawnTree.js";
import { addLinks } from "./link_spawnTree.js";

/**
 * Creates and displays a context menu for TreeSpawn node interactions
 * @description Generates a context menu with expand/collapse options based on node state and handles menu positioning
 * @param {Event} event - Right-click mouse event object containing position and target information
 * @param {Object} d - Tree node data object with expansion state
 * @param {boolean} [d.hasHiddenChildren] - Whether the node has collapsed child nodes
 * @param {boolean} [d.isExpanded] - Whether the node's subtree is currently expanded
 * @param {d3.Selection} contentGroup - D3 selection of the content group for tree rendering
 * @param {Object} treeData - Complete tree data structure for visualization updates
 * @param {Object} metrics - Layout metrics for tree positioning and sizing
 * @param {d3.Selection} tooltip - D3 selection of tooltip element (may be affected by updates)
 * @param {Object} colorMap - Mapping from target classes to color values for node styling
 * @returns {void}
 * @example
 * nodeElement.on("contextmenu", (event, d) => 
 *   createContextMenu(event, d, contentGroup, treeData, metrics, tooltip, colorMap)
 * );
 */
export function createContextMenu(event, d, contentGroup, treeData, metrics, tooltip, colorMap) {
    d3.select('.context-menu').remove();
    
    event.preventDefault();
    event.stopPropagation();
    
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
                updateNodesAndLinks(contentGroup, treeData, metrics, tooltip, colorMap);
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
                updateNodesAndLinks(contentGroup, treeData, metrics, tooltip, colorMap);
                d3.select('.context-menu').remove();
            });
    }
    
    const closeMenu = () => {
        d3.select('.context-menu').remove();
        d3.select('body').on('click.context-menu', null);
    };
    
    setTimeout(() => {
        d3.select('body').on('click.context-menu', closeMenu);
    }, 10);
}

/**
 * Updates tree visualization after subtree expansion or collapse operations
 * @description Completely redraws nodes and links to reflect changes in tree structure visibility
 * @param {d3.Selection} contentGroup - D3 selection of the content group containing tree elements
 * @param {Object} treeData - Updated tree data structure with new visibility states
 * @param {Object} metrics - Layout metrics for positioning calculations
 * @param {d3.Selection} tooltip - D3 selection of tooltip element for interaction setup
 * @param {Object} colorMap - Color mapping for consistent node styling after updates
 * @returns {void}
 * @example
 * updateNodesAndLinks(contentGroup, updatedTreeData, layoutMetrics, tooltipElement, colorMapping);
 * @private
 */
function updateNodesAndLinks(contentGroup, treeData, metrics, tooltip, colorMap) {
    contentGroup.selectAll(".node").remove();
    contentGroup.selectAll(".link").remove();
    
    addLinks(contentGroup, treeData, metrics);
    addNodes(contentGroup, treeData, metrics, tooltip, colorMap);
}
