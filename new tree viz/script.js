import { DIMENSIONS, ZOOM_CONFIG } from './jsModules/constants.js';
import { findInstancePath, buildHierarchy, getBounds } from './jsModules/utils.js';
import { applyCustomPositioning } from './jsModules/positioning.js';
import { drawTree } from './jsModules/drawing.js';

let treeData, instanceData;
let svg, g, zoom;
let initialTransform;

// Initialize the application
init();

async function init() {
    try {
        // Load data files
        const [tree, instance] = await Promise.all([
            d3.json('./data/tree.json'),
            d3.json('./data/instance.json')
        ]);
        
        treeData = tree;
        instanceData = instance;
        
        // Find the path for our instance
        const instancePath = findInstancePath(treeData, instanceData);
        
        // Initialize the visualization
        initializeVisualization(instancePath);
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('tree-container').innerHTML = 
            '<p style="text-align: center; color: red; font-size: 18px; margin-top: 400px;">Error loading data files.</p>';
    }
}

function initializeVisualization(instancePath) {
    const container = d3.select('#tree-container');
    
    svg = container.append('svg')
        .attr('width', DIMENSIONS.width)
        .attr('height', DIMENSIONS.height);
    
    g = svg.append('g');
    
    // Convert flat array to hierarchical structure
    const hierarchy = buildHierarchy(treeData, instancePath);
    
    // Create tree layout
    const tree = d3.tree()
        .size([DIMENSIONS.height - 100, DIMENSIONS.width - 100]);
    
    const root = d3.hierarchy(hierarchy);
    tree(root);
    
    // Apply custom 45-degree positioning
    applyCustomPositioning(root, instancePath);
    
    // Draw the tree
    drawTree(g, root, instancePath, instanceData);
    
    // Set up zoom
    setupZoom(root);
}

function setupZoom(root) {
    const bounds = getBounds(root);
    const scaleX = DIMENSIONS.width / (bounds.maxY - bounds.minY + ZOOM_CONFIG.extraBounds);
    const scaleY = DIMENSIONS.height / (bounds.maxX - bounds.minX + ZOOM_CONFIG.extraBounds);
    const initialScale = Math.min(scaleX, scaleY, ZOOM_CONFIG.minScale);
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    initialTransform = d3.zoomIdentity
        .translate(DIMENSIONS.width / 2, DIMENSIONS.height / 2)
        .scale(initialScale)
        .translate(-centerY, -centerX);
    
    zoom = d3.zoom()
        .scaleExtent([initialScale * ZOOM_CONFIG.scaleExtentFactor, ZOOM_CONFIG.maxZoom])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    svg.call(zoom.transform, initialTransform);
}