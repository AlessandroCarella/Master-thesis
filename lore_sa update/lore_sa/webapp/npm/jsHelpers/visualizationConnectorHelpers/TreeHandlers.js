// TreeHandlers.js - Updated to use encoded features only
import { colorScheme } from "./colors.js";
import { getTreeState } from "../TreesCommon/state.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

// Base class for all tree handlers
class BaseTreeHandler {
    constructor(visualization, treeKind) {
        this.visualization = visualization;
        this.treeKind = treeKind;
        this.state = getTreeState(treeKind);
    }

    // Abstract methods
    highlightNode(nodeId) { throw new Error('Must implement highlightNode'); }
    highlightPath(pathNodeIds) { throw new Error('Must implement highlightPath'); }
    highlightDescendants(nodeId) { throw new Error('Must implement highlightDescendants'); }
    resetHighlights() { throw new Error('Must implement resetHighlights'); }
    findPath(features) { throw new Error('Must implement findPath'); }
    getNodeById(nodeId) { throw new Error('Must implement getNodeById'); }
    highlightInstancePath(instancePath) { throw new Error('Must implement highlightInstancePath'); }
}

// Classic tree handler
export class ClassicTreeHandler extends BaseTreeHandler {
    highlightNode(nodeId) {
        if (!this.visualization?.contentGroup) return;
        
        this.visualization.contentGroup
            .selectAll(".node")
            .filter(d => d.data.node_id === nodeId)
            .select("circle")
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", `${this.visualization.metrics.nodeBorderStrokeWidth}px`);
    }
    
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        // Highlight nodes
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        // Highlight links
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    highlightDescendants(nodeId) {
        const node = this.getNodeById(nodeId);
        if (!node) return;
        
        this._highlightDescendantsRecursive(node);
    }
    
    _highlightDescendantsRecursive(node) {
        // Highlight the current node
        this.highlightNode(node.data.node_id);
        
        // If has children, highlight links to children and recurse
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                // Highlight the link between parent and child
                this._highlightLink(node.data.node_id, child.data.node_id);
                // Recursively highlight descendants
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    resetHighlights() {
        if (!this.visualization?.contentGroup) return;
        
        // Reset node highlights
        this.visualization.contentGroup
            .selectAll(".node circle")
            .style("stroke", colorScheme.ui.nodeStroke)
            .style("stroke-width", `${this.visualization.metrics.nodeBorderStrokeWidth}px`);
        
        // Reset link highlights - restore original colors and stroke widths
        this.visualization.contentGroup
            .selectAll(".link")
            .style("stroke", function(d) {
                // Restore original color from data attribute
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            })
            .style("stroke-width", function(d) {
                return `${d3.select(this).attr("data-original-stroke-width")}px`;
            });
    }
    
    findPath(features) {
        if (!this.visualization?.treeData) return [];
        
        const path = [];
        const root = this.visualization.treeData.descendants().find(d => d.depth === 0);
        let currentNode = root;

        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = shouldGoLeft ?
                currentNode.children?.find(c => c.data.node_id === currentNode.data.left_child) :
                currentNode.children?.find(c => c.data.node_id === currentNode.data.right_child);
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    getNodeById(nodeId) {
        if (!this.visualization?.treeData) return null;
        
        return this.visualization.treeData.descendants().find(d => d.data.node_id === nodeId);
    }
    
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.contentGroup) return;
        
        this.visualization.contentGroup
            .selectAll(".link")
            .filter(d => d.source.data.node_id === sourceId && d.target.data.node_id === targetId)
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    highlightInstancePath(instancePath) {
        if (!this.visualization?.contentGroup || !instancePath || instancePath.length < 2) return;

        const { contentGroup } = this.visualization;
        
        // Reset any existing instance path highlights
        contentGroup
            .selectAll(".link.instance-path")
            .classed("instance-path", false);
        contentGroup.selectAll(".link-highlight").remove();

        // Create an array of link identifiers (source-target pairs)
        const linkPairs = instancePath.slice(0, -1).map((source, i) => ({
            source,
            target: instancePath[i + 1],
        }));

        // Add permanent instance path highlights
        contentGroup
            .selectAll(".link")
            .filter((d) => {
                const sourceId = d.source.data.node_id;
                const targetId = d.target.data.node_id;
                return linkPairs.some(pair => pair.source === sourceId && pair.target === targetId);
            })
            .each(function () {
                const originalPath = d3.select(this);
                const pathD = originalPath.attr("d");
                const baseStrokeWidth = parseFloat(originalPath.attr("data-original-stroke-width"));

                // Add permanent background highlight for instance path using standard D3 approach
                contentGroup
                    .append("path")
                    .attr("class", "link-highlight instance-path-highlight")
                    .attr("d", pathD)
                    .style("stroke", colorScheme.ui.instancePathHighlight)
                    .style("stroke-width", `${baseStrokeWidth * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                    .style("fill", "none")
                    .style("opacity", colorScheme.opacity.originalInstancePath)
                    .lower(); // Put behind normal links

                originalPath.classed("instance-path", true);
            });
    }
}

// Blocks tree handler
export class BlocksTreeHandler extends BaseTreeHandler {
    highlightNode(nodeId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .filter(d => d.id === nodeId)
            .style("stroke", colorScheme.ui.highlight);
    }
    
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    highlightDescendants(nodeId) {
        // For blocks tree, we need to use the hierarchy structure
        const hierarchyNode = this._findHierarchyNode(nodeId);
        if (!hierarchyNode) return;
        
        this._highlightDescendantsRecursive(hierarchyNode);
    }
    
    _highlightDescendantsRecursive(hierarchyNode) {
        // Highlight the current node
        this.highlightNode(hierarchyNode.data.node_id);
        
        // If has children, highlight links to children and recurse
        if (hierarchyNode.children && hierarchyNode.children.length > 0) {
            hierarchyNode.children.forEach(child => {
                // Highlight the link between parent and child
                this._highlightLink(hierarchyNode.data.node_id, child.data.node_id);
                // Recursively highlight descendants
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    _findHierarchyNode(nodeId) {
        const root = this.state.hierarchyRoot;
        if (!root) return null;

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
        return search(root);
    }
    
    resetHighlights() {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .style("stroke", colorScheme.ui.nodeStroke);
        
        // Reset link colors to original colors
        this.visualization.container
            .selectAll(".link")
            .style("stroke", function(d) {
                // Restore original color from data attribute
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            })
            .style("stroke-width", function(d) {
                return `${d3.select(this).attr("data-original-stroke-width")}px`;
            });
    }
    
    findPath(features) {
        const root = this.state.hierarchyRoot;
        if (!root) return [];

        const path = [];
        let currentNode = root;

        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = currentNode.children?.find(child =>
                shouldGoLeft ?
                    child.data.node_id === currentNode.data.left_child :
                    child.data.node_id === currentNode.data.right_child
            );
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    getNodeById(nodeId) {
        const root = this.state.hierarchyRoot;
        if (!root) return null;

        function search(node) {
            if (node.data.node_id === nodeId) return node.data;
            if (node.children) {
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
            }
            return null;
        }
        return search(root);
    }
    
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".link")
            .filter(d => (d.sourceId === sourceId && d.targetId === targetId) ||
                        (d.sourceId === targetId && d.targetId === sourceId))
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    highlightInstancePath(instancePath) {
        if (!this.visualization?.container || !instancePath || instancePath.length < 2) return;

        const { container } = this.visualization;
        
        // Reset any existing path highlights
        container
            .selectAll(".link.instance-path")
            .classed("instance-path", false);
        container.selectAll(".link-highlight").remove();

        if (!instancePath || instancePath.length < 2) return;

        const linkPairs = instancePath.slice(0, -1).map((source, i) => ({
            source,
            target: instancePath[i + 1],
        }));

        container
            .selectAll(".link")
            .filter((d) => {
                const sourceId = d.sourceId;
                const targetId = d.targetId;
                return linkPairs.some(pair => pair.source === sourceId && pair.target === targetId);
            })
            .each(function () {
                const originalLink = d3.select(this);
                const x1 = originalLink.attr("x1");
                const y1 = originalLink.attr("y1");
                const x2 = originalLink.attr("x2");
                const y2 = originalLink.attr("y2");
                
                container
                    .append("line")
                    .attr("class", "link-highlight instance-path-highlight")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("stroke", colorScheme.ui.instancePathHighlight)
                    .style("opacity", colorScheme.opacity.originalInstancePath)
                    .style("stroke-width", `${d3.select(this).attr("data-original-stroke-width") * TREES_SETTINGS.visual.strokeWidth.pathHighlightMultiplier}px`)
                    .lower();

                originalLink.classed("instance-path", true);
            });
    }
}

// TreeSpawn handler
export class TreeSpawnHandler extends BaseTreeHandler {
    highlightNode(nodeId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .filter(d => d.data?.node_id === nodeId)
            .selectAll("circle, rect")
            .style("stroke", colorScheme.ui.highlight);
    }
    
    highlightPath(pathNodeIds) {
        if (!pathNodeIds || pathNodeIds.length < 2) return;
        
        pathNodeIds.forEach(nodeId => this.highlightNode(nodeId));
        
        for (let i = 0; i < pathNodeIds.length - 1; i++) {
            this._highlightLink(pathNodeIds[i], pathNodeIds[i + 1]);
        }
    }
    
    highlightDescendants(nodeId) {
        // For spawn tree, we can use the tree data structure
        if (this.visualization?.treeData) {
            const treeNode = this._findTreeDataNode(nodeId);
            if (treeNode) {
                this._highlightDescendantsRecursive(treeNode);
                return;
            }
        }
        
        // Fallback: use raw data structure
        const rawNode = this.getNodeById(nodeId);
        if (rawNode) {
            this._highlightDescendantsFromRawData(rawNode);
        }
    }
    
    _highlightDescendantsRecursive(treeNode) {
        // Highlight the current node
        this.highlightNode(treeNode.data.node_id);
        
        // If has children, highlight links to children and recurse
        if (treeNode.children && treeNode.children.length > 0) {
            treeNode.children.forEach(child => {
                // Highlight the link between parent and child
                this._highlightLink(treeNode.data.node_id, child.data.node_id);
                // Recursively highlight descendants
                this._highlightDescendantsRecursive(child);
            });
        }
    }
    
    _highlightDescendantsFromRawData(rawNode) {
        // Highlight the current node
        this.highlightNode(rawNode.node_id);
        
        // Find and highlight children from raw data
        if (!rawNode.is_leaf && this.state.treeData) {
            const children = this.state.treeData.filter(node => 
                node.node_id === rawNode.left_child || node.node_id === rawNode.right_child
            );
            
            children.forEach(child => {
                this._highlightLink(rawNode.node_id, child.node_id);
                this._highlightDescendantsFromRawData(child);
            });
        }
    }
    
    _findTreeDataNode(nodeId) {
        if (!this.visualization?.treeData) return null;
        
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
        
        // Find root node
        const root = this.visualization.treeData.descendants().find(d => d.depth === 0);
        return root ? search(root) : null;
    }
    
    resetHighlights() {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".node")
            .selectAll("circle, rect")
            .style("stroke", colorScheme.ui.nodeStroke);
        
        // Reset link colors to original colors
        this.visualization.container
            .selectAll(".link")
            .style("stroke", function(d) {
                // Restore original color from data attribute
                return d3.select(this).attr("data-original-stroke-color") || colorScheme.ui.linkStroke;
            });
    }
    
    // More robust findPath method using encoded features only
    findPath(features) {
        // Method 1: Try using raw data traversal (most reliable)
        if (this.state.treeData && Array.isArray(this.state.treeData)) {
            const path = this._traverseFromRawData(features);
            if (path.length > 0) {
                return path;
            }
        }
        
        // Method 2: Try using hierarchy if available
        if (this.state.hierarchyRoot) {
            const path = this._traverseFromHierarchy(features);
            if (path.length > 0) {
                return path;
            }
        }
        
        // Method 3: Use existing instance path as fallback (least reliable for new features)
        if (this.state.instancePath?.length > 0) {
            return [...this.state.instancePath];
        }
        
        console.warn("TreeSpawnHandler: No path found, returning empty array");
        return [];
    }
    
    // Enhanced raw data traversal using encoded features only
    _traverseFromRawData(features) {
        if (!this.state.treeData || !Array.isArray(this.state.treeData)) {
            console.warn("TreeSpawnHandler: No raw tree data available");
            return [];
        }
        
        const nodesById = {};
        this.state.treeData.forEach(node => {
            nodesById[node.node_id] = node;
        });
        
        const path = [];
        let currentNode = nodesById[0]; // Start at root
        
        while (currentNode && !currentNode.is_leaf) {
            path.push(currentNode.node_id);
            
            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            const nextNodeId = shouldGoLeft ? currentNode.left_child : currentNode.right_child;
            currentNode = nodesById[nextNodeId];
            
            if (!currentNode) {
                console.warn(`TreeSpawnHandler: Could not find next node with ID ${nextNodeId}`);
                break;
            }
        }
        
        // Add the final leaf node
        if (currentNode?.is_leaf) {
            path.push(currentNode.node_id);
        }
        
        return path;
    }
    
    // Hierarchy traversal method using encoded features only
    _traverseFromHierarchy(features) {
        if (!this.state.hierarchyRoot) return [];
        
        const path = [];
        let currentNode = this.state.hierarchyRoot;
        
        // If hierarchyRoot is a d3.hierarchy object, get the root node
        if (currentNode.descendants) {
            currentNode = currentNode.descendants().find(d => d.depth === 0);
        }
        
        while (currentNode && !currentNode.data.is_leaf) {
            path.push(currentNode.data.node_id);
            
            const featureName = currentNode.data.feature_name;
            const threshold = currentNode.data.threshold;
            const featureValue = features[featureName];
            
            if (featureValue === undefined) {
                break;
            }
            
            const shouldGoLeft = featureValue <= threshold;
            
            currentNode = currentNode.children?.find(child =>
                shouldGoLeft ?
                    child.data.node_id === currentNode.data.left_child :
                    child.data.node_id === currentNode.data.right_child
            );
        }
        
        if (currentNode?.data.is_leaf) {
            path.push(currentNode.data.node_id);
        }
        
        return path;
    }
    
    getNodeById(nodeId) {
        if (!this.state.treeData) return null;
        return this.state.treeData.find(node => node.node_id === nodeId);
    }
    
    _highlightLink(sourceId, targetId) {
        if (!this.visualization?.container) return;
        
        this.visualization.container
            .selectAll(".link")
            .filter(d => (d.source.data.node_id === sourceId && d.target.data.node_id === targetId) ||
                        (d.source.data.node_id === targetId && d.target.data.node_id === sourceId))
            .style("stroke", colorScheme.ui.highlight)
            .style("stroke-width", function(d) {
                const baseWidth = parseFloat(d3.select(this).attr("data-original-stroke-width"));
                return `${baseWidth}px`;
            });
    }
    
    highlightInstancePath(instancePath) {
        if (!this.visualization || !instancePath || instancePath.length === 0) return;

        // Add persistent background highlights for the instance path
        this._addInstancePathBackgroundDirect(instancePath);
    }

    _addInstancePathBackgroundDirect(instancePath) {
        // Add validation for required properties
        if (!this.visualization.container || !this.visualization.treeData || !this.visualization.metrics) {
            console.warn("TreeSpawn visualization not properly initialized, cannot add instance path background");
            return;
        }
        
        const { container, treeData, metrics } = this.visualization;
        
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
        
        // Create permanent instance path highlights
        container
            .selectAll(".instance-path-background")
            .data(instancePathLinks)
            .join("path")
            .attr("class", "instance-path-background instance-path-highlight")
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
    }
}

// Factory for creating handlers
export class TreeHandlerFactory {
    static create(treeKind, visualization) {
        switch (treeKind) {
            case TREES_SETTINGS.treeKindID.classic:
                return new ClassicTreeHandler(visualization, treeKind);
            case TREES_SETTINGS.treeKindID.blocks:
                return new BlocksTreeHandler(visualization, treeKind);
            case TREES_SETTINGS.treeKindID.spawn:
                return new TreeSpawnHandler(visualization, treeKind);
            default:
                throw new Error(`Unknown tree kind: ${treeKind}`);
        }
    }
}
