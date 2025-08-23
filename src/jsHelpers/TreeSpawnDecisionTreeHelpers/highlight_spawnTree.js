import { colorScheme } from "../visualizationConnector.js";

// Highlight a specific node in TreeSpawn tree
export function highlightTreeSpawnNode(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Highlight both circles and rectangles (path nodes use rectangles, others use circles)
    treeSpawnVis.container
        .selectAll(".node")
        .filter((d) => d.data.node_id === nodeId)
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.highlight)
        .style("stroke-width", "3px");
}

// Highlight a path in TreeSpawn tree (for interactive highlighting)
export function highlightTreeSpawnPath(treeSpawnVis, pathNodeIds) {
    if (!treeSpawnVis || !treeSpawnVis.container || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightTreeSpawnNode(treeSpawnVis, nodeId);
    });

    // Highlight links in the path (only the normal .link elements, not the background)
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const sourceId = pathNodeIds[i];
        const targetId = pathNodeIds[i + 1];

        treeSpawnVis.container
            .selectAll(".link") // Only target normal links, not .instance-path-background
            .filter((d) => {
                return (d.source.data.node_id === sourceId && d.target.data.node_id === targetId) ||
                       (d.source.data.node_id === targetId && d.target.data.node_id === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                // Use moderate highlight for interactive selection
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth}px`;
            });
    }
}

// Highlight descendants of a node (for split nodes)
export function highlightTreeSpawnDescendants(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.container || !treeSpawnVis.treeData) return;

    // Find the node in the tree data
    const targetNode = findNodeInTreeData(treeSpawnVis.treeData, nodeId);
    if (!targetNode) return;

    // Collect all descendant node IDs
    const descendants = [];
    
    function collectDescendants(node) {
        descendants.push(node.data.node_id);
        if (node.children) {
            node.children.forEach(child => {
                collectDescendants(child);
            });
        }
    }

    collectDescendants(targetNode);

    // Highlight all descendant nodes
    descendants.forEach(descendantId => {
        highlightTreeSpawnNode(treeSpawnVis, descendantId);
    });

    // Highlight links between consecutive levels of descendants
    function highlightDescendantLinks(node) {
        if (node.children) {
            node.children.forEach(child => {
                // Highlight the link between parent and child (only normal links)
                treeSpawnVis.container
                    .selectAll(".link") // Only target normal links, not .instance-path-background
                    .filter((d) => {
                        return (d.source.data.node_id === node.data.node_id && 
                                d.target.data.node_id === child.data.node_id) ||
                               (d.source.data.node_id === child.data.node_id && 
                                d.target.data.node_id === node.data.node_id);
                    })
                    .style("stroke", colorScheme.ui.highlight)
                    .style("stroke-width", function(d) {
                        const originalWidth = d3.select(this).attr("data-original-stroke-width");
                        return `${originalWidth}px`; // Moderate highlight for interactive selection
                    });
                
                // Recursively highlight descendant links
                highlightDescendantLinks(child);
            });
        }
    }

    highlightDescendantLinks(targetNode);
}

// Reset interactive highlights in TreeSpawn tree (keeps persistent instance path background)
export function resetTreeSpawnHighlights(treeSpawnVis) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Reset node highlights (both circles and rectangles)
    treeSpawnVis.container
        .selectAll(".node")
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.nodeStroke)
        .style("stroke-width", "2px"); // Use default stroke width

    // Reset interactive highlights on normal links only
    // Leave .instance-path-background elements untouched (they're persistent)
    treeSpawnVis.container
        .selectAll(".link") // Only target normal links, not .instance-path-background
        .style("stroke", colorScheme.ui.linkStroke)
        .style("stroke-width", function(d) {
            // Use the stored original stroke width
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        });
}

// Get path to a specific node in TreeSpawn tree
export function getPathToNodeInTreeSpawn(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.instancePath) return [];

    // Use the existing instance path if the node is in it
    if (treeSpawnVis.instancePath.includes(nodeId)) {
        const nodeIndex = treeSpawnVis.instancePath.indexOf(nodeId);
        return treeSpawnVis.instancePath.slice(0, nodeIndex + 1);
    }

    // If not in instance path, try to find path from tree structure
    if (!treeSpawnVis.treeData) return [];

    const path = [];
    
    function findPathToNode(node, targetId, currentPath) {
        currentPath.push(node.data.node_id);
        
        if (node.data.node_id === targetId) {
            return currentPath.slice(); // Return a copy of the path
        }
        
        if (node.children) {
            for (const child of node.children) {
                const result = findPathToNode(child, targetId, currentPath);
                if (result) return result;
            }
        }
        
        currentPath.pop(); // Backtrack
        return null;
    }

    const foundPath = findPathToNode(treeSpawnVis.treeData, nodeId, []);
    return foundPath || [];
}

// Helper function to find a node in the tree data structure
function findNodeInTreeData(treeData, nodeId) {
    if (!treeData) return null;

    function search(node) {
        if (node.data.node_id === nodeId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = search(child);
                if (found) return found;
            }
        }
        return null;
    }

    return search(treeData);
}

// Highlight instance path in TreeSpawn tree with background (called when explicitly requested)
export function addInstancePathHighlightToTreeSpawn(treeSpawnVis, instancePath) {
    if (!treeSpawnVis || !instancePath || instancePath.length === 0) return;

    // Add persistent background highlights for the instance path
    addInstancePathBackgroundDirect(treeSpawnVis, instancePath);

    // Also add interactive highlights
    // highlightTreeSpawnPath(treeSpawnVis, instancePath);
}

// Helper function to add instance path background directly
function addInstancePathBackgroundDirect(treeSpawnVis, instancePath) {
    // Add validation for required properties
    if (!treeSpawnVis || !treeSpawnVis.container || !treeSpawnVis.treeData || !treeSpawnVis.metrics) {
        console.warn("TreeSpawn visualization not properly initialized, cannot add instance path background");
        return;
    }
    
    const { container, treeData, metrics } = treeSpawnVis;
    
    // Remove existing background highlights first
    container.selectAll(".instance-path-background").remove();
    
    if (!instancePath || instancePath.length === 0) return;
    
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    const instancePathLinks = visibleLinks.filter(link => {
        const sourceId = link.source.data.node_id;
        const targetId = link.target.data.node_id;
        
        // Check if both source and target are consecutive in the path
        for (let i = 0; i < instancePath.length - 1; i++) {
            if (instancePath[i] === sourceId && instancePath[i + 1] === targetId) {
                return true;
            }
        }
        return false;
    });
    
    container
        .selectAll(".instance-path-background")
        .data(instancePathLinks)
        .join("path")
        .attr("class", "instance-path-background")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            // Calculate original stroke width
            const ratio = (d.target.data.weighted_n_samples || d.target.data.n_samples) / treeData.data.n_samples;
            const originalStrokeWidth = ratio * 3 * metrics.linkStrokeWidth;
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
        })
        .style("stroke-width", function(d) {
            // Use larger stroke width for background highlight
            const originalWidth = d3.select(this).attr("data-original-stroke-width");
            return `${originalWidth * 2}px`;
        })
        .attr("d", (d) => {
            // Create path using same logic as normal links
            const { x: sourceX, y: sourceY } = d.source;
            const { x: targetX, y: targetY } = d.target;
            return `M${sourceX},${sourceY} L${targetX},${targetY}`;
        })
        .style("fill", "none")
        .style("stroke", colorScheme.ui.instancePathHighlight)
        .style("opacity", colorScheme.opacity.originalInstancePath)
        .lower(); // Put behind normal links
}

// Highlight path to root for leaf nodes (similar to classic tree functionality)
export function highlightPathToRootInTreeSpawn(treeSpawnVis, leafNodeId) {
    if (!treeSpawnVis) return;

    const pathToRoot = getPathToNodeInTreeSpawn(treeSpawnVis, leafNodeId);
    if (pathToRoot.length > 0) {
        highlightTreeSpawnPath(treeSpawnVis, pathToRoot);
    }
}

// Highlight specific links in TreeSpawn tree (for interactive highlighting)
export function highlightTreeSpawnLinks(treeSpawnVis, linkPairs) {
    if (!treeSpawnVis || !treeSpawnVis.container || !linkPairs) return;

    linkPairs.forEach(pair => {
        treeSpawnVis.container
            .selectAll(".link") // Only target normal links, not .instance-path-background
            .filter((d) => {
                return (d.source.data.node_id === pair.source && d.target.data.node_id === pair.target) ||
                       (d.source.data.node_id === pair.target && d.target.data.node_id === pair.source);
            })
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const originalWidth = d3.select(this).attr("data-original-stroke-width");
                return `${originalWidth}px`; // Moderate highlight for interactive selection
            });
    });
}