import { expandSubtree, collapseSubtree } from "./subtrees_spawnTree.js";

// Function to refresh the visualization after expand/collapse
function refreshVisualization() {
    // Import the refreshVisualization function from DecisionTree.js
    import('../TreeSpawnDecisionTree.js').then(module => {
        module.refreshVisualization();
    });
}

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
        .style('top', (event.pageY + 5) + 'px');
    
    if (d.hasHiddenChildren) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .text('Expand Subtree')
            .on('click', () => {
                expandSubtree(d);
                refreshVisualization();
                d3.select('.context-menu').remove();
            });
    }
    
    if (d.isExpanded) {
        menu.append('div')
            .attr('class', 'context-menu-item')
            .text('Collapse Subtree')
            .on('click', () => {
                collapseSubtree(d);
                refreshVisualization();
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