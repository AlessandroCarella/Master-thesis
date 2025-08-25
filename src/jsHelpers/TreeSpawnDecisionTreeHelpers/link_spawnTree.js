import { colorScheme } from "../visualizationConnector.js";
import { spawnTreeState } from "../TreesCommon/state.js";
import { getStrokeWidth } from "../TreesCommon/metrics.js";
import { findInstancePath } from "../TreesCommon/dataProcessing.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

function createSplitPath({ source, target }) {
    const { x: sourceX, y: sourceY } = source;
    const { x: targetX, y: targetY } = target;
    
    // For the linear path layout, we want different link styles
    const isSourceInPath = source.isInPath;
    
    if (isSourceInPath) {
        // Direct horizontal line for path connections
        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
    } else {
        // Standard curved connection for off-path subtrees
        const midY = (sourceY + targetY) / 2;
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY =
            midY -
            Math.abs(targetX - sourceX) * Math.tan(TREES_SETTINGS.tree.radianAngle / 2);
        return `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;
    }
}

export function addLinks(contentGroup, treeData, metrics) {
    // Only create links between visible nodes
    const visibleLinks = treeData.links().filter(link => 
        !link.source.isHidden && !link.target.isHidden
    );
    
    contentGroup
        .selectAll(".link")
        .data(visibleLinks, d => `${d.source.data.node_id}-${d.target.data.node_id}`)
        .join("path")
        .attr("class", "link")
        .attr("data-source-id", (d) => d.source.data.node_id)
        .attr("data-target-id", (d) => d.target.data.node_id)
        .each(function(d) {
            // Calculate and store the original stroke width based on samples
            const totalSamples = spawnTreeState.treeData ? spawnTreeState.treeData[0].n_samples : d.target.data.n_samples;
            const originalStrokeWidth = getStrokeWidth(
                d.target.data.weighted_n_samples || d.target.data.n_samples, 
                totalSamples, 
                metrics.linkStrokeWidth,
                "spawn"
            );
            d3.select(this).attr("data-original-stroke-width", originalStrokeWidth);
        })
        .style("stroke-width", function(d) {
            return `${d3.select(this).attr("data-original-stroke-width")}px`;
        })
        .attr("d", (d) => createSplitPath(d))
        .style("fill", "none")
        .style("stroke", colorScheme.ui.linkStroke)
        .style("opacity", colorScheme.opacity.default);
}

// Highlight a specific node in TreeSpawn tree
export function highlightTreeSpawnNode(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    treeSpawnVis.container
        .selectAll(".node")
        .filter((d) => d.data.node_id === nodeId)
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.highlight)
}

// Highlight a path in TreeSpawn tree (for interactive highlighting)
export function highlightTreeSpawnPath(treeSpawnVis, pathNodeIds) {
    if (!treeSpawnVis || !treeSpawnVis.container || !pathNodeIds) return;

    // Highlight nodes in the path
    pathNodeIds.forEach(nodeId => {
        highlightTreeSpawnNode(treeSpawnVis, nodeId);
    });

    // Highlight links in the path
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const sourceId = pathNodeIds[i];
        const targetId = pathNodeIds[i + 1];

        treeSpawnVis.container
            .selectAll(".link")
            .filter((d) => {
                return (d.source.data.node_id === sourceId && d.target.data.node_id === targetId) ||
                       (d.source.data.node_id === targetId && d.target.data.node_id === sourceId);
            })
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
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
                treeSpawnVis.container
                    .selectAll(".link")
                    .filter((d) => {
                        return (d.source.data.node_id === node.data.node_id && 
                                d.target.data.node_id === child.data.node_id) ||
                               (d.source.data.node_id === child.data.node_id && 
                                d.target.data.node_id === node.data.node_id);
                    })
                    .style("stroke", colorScheme.ui.highlight)
                    .style("stroke-width", function(d) {
                        const originalWidth = d3.select(this).attr("data-original-stroke-width");
                        return `${originalWidth}px`;
                    });
                
                highlightDescendantLinks(child);
            });
        }
    }

    highlightDescendantLinks(targetNode);
}

// Reset interactive highlights in TreeSpawn tree
export function resetTreeSpawnHighlights(treeSpawnVis) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Reset node highlights
    treeSpawnVis.container
        .selectAll(".node")
        .selectAll("circle, rect")
        .style("stroke", colorScheme.ui.nodeStroke);

    // Reset link highlights
    treeSpawnVis.container
        .selectAll(".link")
        .style("stroke", colorScheme.ui.linkStroke);
}

// FIXED: Get path to a specific node in TreeSpawn tree - works for ANY node
export function getPathToNodeInTreeSpawn(treeSpawnVis, nodeId) {
    if (!treeSpawnVis) return [];

    // First try to use instance path if the node is in it
    if (treeSpawnVis.instancePath && treeSpawnVis.instancePath.includes(nodeId)) {
        const nodeIndex = treeSpawnVis.instancePath.indexOf(nodeId);
        return treeSpawnVis.instancePath.slice(0, nodeIndex + 1);
    }

    // If not in instance path or instance path not available, find path from tree structure
    if (!treeSpawnVis.rawTreeData) return [];

    // Create node lookup from raw tree data
    const nodesById = {};
    treeSpawnVis.rawTreeData.forEach(node => {
        nodesById[node.node_id] = node;
    });
    
    // Find path from root (node_id = 0) to target node
    function findPath(currentNodeId, targetNodeId, path = []) {
        const newPath = [...path, currentNodeId];
        
        if (currentNodeId === targetNodeId) {
            return newPath;
        }
        
        const currentNode = nodesById[currentNodeId];
        if (!currentNode || currentNode.is_leaf) {
            return null;
        }
        
        // Try left child
        if (currentNode.left_child !== null) {
            const leftPath = findPath(currentNode.left_child, targetNodeId, newPath);
            if (leftPath) return leftPath;
        }
        
        // Try right child  
        if (currentNode.right_child !== null) {
            const rightPath = findPath(currentNode.right_child, targetNodeId, newPath);
            if (rightPath) return rightPath;
        }
        
        return null;
    }
    
    return findPath(0, nodeId) || [];
}

// Highlight instance path in TreeSpawn tree with background (called when explicitly requested)
export function addInstancePathHighlightToTreeSpawn(treeSpawnVis, instancePath) {
    if (!treeSpawnVis || !instancePath || instancePath.length === 0) return;

    // Add persistent background highlights for the instance path
    addInstancePathBackgroundDirect(treeSpawnVis, instancePath);
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
    
    // Import colorScheme for styling
    import("../visualizationConnector.js").then(module => {
        const { colorScheme } = module;
        
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
                return `${originalWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`;
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
    });
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