// visualization-connector.js

// Global state to store visualization references
let pcaVisualization = null;
let treeVisualization = null;

function getNodeColor(targetClass, colorMap) {
    // If we don't have a color map, fallback to a default color
    if (!colorMap) {
        return "#purple";
    }
    return colorMap[targetClass] || "#purple";
}

// Function to reset all highlights
function resetHighlights() {
    // Reset decision tree highlights
    if (document.querySelector("#visualization")) {
        d3.selectAll(".link").style("stroke", "#ccc");
        d3.selectAll(".node circle")
            .style("stroke", "#ccc")
            .style("stroke-width", (d, i, nodes) => {
                const node = d3.select(nodes[i]).node().__data__;
                return node.data.metrics?.nodeBorderStrokeWidth + 'px' || '3px';
            });
    }

    // Reset PCA plot highlights
    if (pcaVisualization && pcaVisualization.points) {
        pcaVisualization.points
            .style("fill", (d, i) => getNodeColor(pcaVisualization.data.targets[i]))
            .style("opacity", 0.8);
    }
}

// Function to determine if a point belongs to a leaf node's decision path
function pointBelongsToLeaf(point, originalData, leafNode) {
    let currentNode = leafNode;
    while (currentNode.parent) {
        const parentData = currentNode.parent.data;
        if (!parentData.feature_name) continue;
        
        const featureValue = originalData[parentData.feature_name];
        const isLeftChild = currentNode === currentNode.parent.children[0];
        
        if (isLeftChild && featureValue > parentData.threshold) return false;
        if (!isLeftChild && featureValue <= parentData.threshold) return false;
        
        currentNode = currentNode.parent;
    }
    return true;
}

// Function to highlight points in PCA plot based on selected leaf node
function highlightPointsForLeaf(leafNode) {
    if (!pcaVisualization || !pcaVisualization.points) return;

    pcaVisualization.points
        .style("fill", (d, i) => {
            const originalData = pcaVisualization.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode) ? "red" : 
                   getNodeColor(pcaVisualization.data.targets[i]);
        })
        .style("opacity", (d, i) => {
            const originalData = pcaVisualization.data.originalData[i];
            return pointBelongsToLeaf(d, originalData, leafNode) ? 1 : 0.3;
        });
}

// Enhanced node click handler for decision tree
function handleTreeNodeClick(event, d, contentGroup, treeData, metrics) {
    event.stopPropagation();
    
    // Reset all highlights
    resetHighlights();

    // If clicked node is a leaf, highlight its path and corresponding PCA points
    if (d.data.is_leaf) {
        // Highlight path to root in decision tree
        let currentNode = d;
        while (currentNode.parent) {
            let link = contentGroup
                .selectAll(".link")
                .data(treeData.links())
                .filter(linkData => 
                    linkData.source === currentNode.parent && 
                    linkData.target === currentNode
                );

            link.style("stroke", "red")
                .style("stroke-width", `${metrics.linkStrokeWidth}px`);
            currentNode = currentNode.parent;
        }

        // Highlight node
        d3.select(event.currentTarget)
            .select("circle")
            .style("stroke", "red")
            .style("stroke-width", `${metrics.nodeBorderStrokeWidth}px`);

        // Highlight corresponding points in PCA plot
        highlightPointsForLeaf(d);
    }
}

function setPCAVisualization(vis) {
    console.log('Setting PCA visualization:', vis);
    pcaVisualization = vis;
    window.pcaVisualization = vis; // Also set on window for global access
}

function setTreeVisualization(vis) {
    console.log('Setting Tree visualization:', vis);
    treeVisualization = vis;
    window.treeVisualization = vis; // Also set on window for global access
}

// Add getter functions
function getPCAVisualization() {
    return pcaVisualization;
}

function getTreeVisualization() {
    return treeVisualization;
}

export {
    setPCAVisualization,
    setTreeVisualization,
    getPCAVisualization,
    getTreeVisualization,
    handleTreeNodeClick,
    resetHighlights
};