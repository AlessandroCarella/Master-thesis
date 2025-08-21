// Reset all highlights in TreeSpawn visualization
export function resetTreeSpawnHighlights(treeSpawnVis) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Reset all node highlights
    treeSpawnVis.container
        .selectAll(".node circle, .node rect")
        .style("stroke", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            return isInPath ? "#d40f15" : "#666666";
        })
        .style("stroke-width", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            return isInPath ? "2px" : "1px";
        })
        .style("opacity", 1);

    // Reset all link highlights
    treeSpawnVis.container
        .selectAll(".link")
        .style("stroke", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            return isInPath ? "#d40f15" : "#999999";
        })
        .style("stroke-width", function(d) {
            const isInPath = d3.select(this).attr("data-in-path") === "true";
            const originalWidth = d3.select(this).attr("data-original-stroke-width");
            return isInPath ? "3px" : `${originalWidth}px`;
        });
}

// Highlight a specific node in TreeSpawn visualization
export function highlightTreeSpawnNode(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    treeSpawnVis.container
        .selectAll(".node")
        .filter(d => d.data.node_id === nodeId)
        .selectAll("circle, rect")
        .style("stroke", "#ff4444")
        .style("stroke-width", "3px")
        .style("opacity", 1);
}

// Highlight a path of nodes in TreeSpawn visualization
export function highlightTreeSpawnPath(treeSpawnVis, pathNodeIds) {
    if (!treeSpawnVis || !treeSpawnVis.container || !pathNodeIds || pathNodeIds.length === 0) return;

    // Highlight nodes in the path
    treeSpawnVis.container
        .selectAll(".node")
        .filter(d => pathNodeIds.includes(d.data.node_id))
        .selectAll("circle, rect")
        .style("stroke", "#ff4444")
        .style("stroke-width", "3px");

    // Highlight links in the path
    treeSpawnVis.container
        .selectAll(".link")
        .filter(function(d) {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;
            
            // Check if both source and target are consecutive in the path
            for (let i = 0; i < pathNodeIds.length - 1; i++) {
                if (pathNodeIds[i] === sourceId && pathNodeIds[i + 1] === targetId) {
                    return true;
                }
            }
            return false;
        })
        .style("stroke", "#ff4444")
        .style("stroke-width", "3px");
}

// Highlight descendants of a node in TreeSpawn visualization
export function highlightTreeSpawnDescendants(treeSpawnVis, nodeId) {
    if (!treeSpawnVis || !treeSpawnVis.container) return;

    // Find the node and all its descendants
    let descendants = [];
    
    function findDescendants(node) {
        if (node.data.node_id === nodeId) {
            // Found the target node, collect all its descendants
            function collectDescendants(currentNode) {
                descendants.push(currentNode.data.node_id);
                if (currentNode.children) {
                    currentNode.children.forEach(child => collectDescendants(child));
                }
            }
            collectDescendants(node);
            return true;
        }
        
        if (node.children) {
            return node.children.some(child => findDescendants(child));
        }
        return false;
    }

    // Start search from the tree data
    if (treeSpawnVis.treeData) {
        findDescendants(treeSpawnVis.treeData);
    }

    // Highlight all descendant nodes
    if (descendants.length > 0) {
        treeSpawnVis.container
            .selectAll(".node")
            .filter(d => descendants.includes(d.data.node_id))
            .selectAll("circle, rect")
            .style("stroke", "#ff4444")
            .style("stroke-width", "3px");
    }
}

// Highlight instance path in TreeSpawn visualization
export function highlightInstancePathInTreeSpawn(treeSpawnVis, instancePath) {
    if (!treeSpawnVis || !instancePath || instancePath.length === 0) return;
    
    highlightTreeSpawnPath(treeSpawnVis, instancePath);
}