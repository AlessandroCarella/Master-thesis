// ScatterPlotHighlighter.js - Updated to work with encoded features only
import { colorScheme } from "./colors.js";
import { getGlobalColorMap } from "./colors.js";

export class ScatterPlotHighlighter {
    constructor(scatterPlotVisualization) {
        this.visualization = scatterPlotVisualization;
        this.originalPointsNeighPointsBoolArray = null;
    }
    
    setOriginalPointsNeighPointsBoolArray(array) {
        this.originalPointsNeighPointsBoolArray = array;
    }
    
    getOriginalPointsNeighPointsBoolArrayValAti(index) {
        return this.originalPointsNeighPointsBoolArray?.[index] ?? true;
    }
    
    highlightPointsForNode(nodeId, rawTreeData) {
        if (!this.visualization?.points || !rawTreeData) return;
        
        const targetNode = rawTreeData.find(node => node.node_id === nodeId);
        if (!targetNode) return;
        
        if (targetNode.is_leaf) {
            this._highlightPointsForLeaf(nodeId, rawTreeData);
        } else {
            this._highlightPointsForDescendants(nodeId, rawTreeData);
        }
    }
    
    resetHighlights() {
        if (!this.visualization?.points) return;
        
        const globalColorMap = getGlobalColorMap();
        
        // If color map is null (during reset), just remove all styling
        if (!globalColorMap) {
            this.visualization.points
                .style("fill", null)
                .style("opacity", null);
            return;
        }
        
        this.visualization.points
            .style("fill", (d, i) => globalColorMap[this.visualization.data.targets[i]])
            .style("opacity", (d, i) => 
                this.getOriginalPointsNeighPointsBoolArrayValAti(i) ? 
                    colorScheme.opacity.datasetPoint : 
                    colorScheme.opacity.neighPoint
            );
    }
    
    _highlightPointsForLeaf(nodeId, rawTreeData) {
        this.visualization.points
            .style("fill", (d, i) => {
                const originalData = this.visualization.data.originalData[i];
                const belongs = this._pointBelongsToNode(originalData, nodeId, rawTreeData);
                return belongs ? 
                    colorScheme.ui.highlight : 
                    getGlobalColorMap()[this.visualization.data.targets[i]];
            });
    }
    
    _highlightPointsForDescendants(nodeId, rawTreeData) {
        const descendantIds = this._getDescendantNodeIds(nodeId, rawTreeData);
        const leafDescendantIds = descendantIds.filter(id => {
            const node = rawTreeData.find(n => n.node_id === id);
            return node?.is_leaf;
        });
        
        this.visualization.points
            .style("fill", (d, i) => {
                const originalData = this.visualization.data.originalData[i];
                
                for (const leafId of leafDescendantIds) {
                    if (this._pointBelongsToNode(originalData, leafId, rawTreeData)) {
                        return colorScheme.ui.highlight;
                    }
                }
                
                return getGlobalColorMap()[this.visualization.data.targets[i]];
            });
    }
    
    _pointBelongsToNode(originalData, nodeId, rawTreeData) {
        const pathToNode = this._buildPathToNode(nodeId, rawTreeData);
        
        if (pathToNode.length === 0) {
            console.warn("No path found to node:", nodeId);
            return false;
        }

        if (pathToNode.length === 1 && nodeId === 0) {
            return true; // Root node contains all points
        }

        // Check if point satisfies all conditions in the path using encoded features
        for (let i = 0; i < pathToNode.length - 1; i++) {
            const currentNode = pathToNode[i];
            const nextNode = pathToNode[i + 1];
            
            if (!currentNode.feature_name) {
                continue;
            }

            const featureName = currentNode.feature_name;
            const threshold = currentNode.threshold;
            const wentLeft = nextNode.node_id === currentNode.left_child;
            
            // For encoded features, simply compare with threshold
            const featureValue = originalData[featureName];
            if (featureValue === undefined) {
                console.warn(`Encoded feature ${featureName} not found in original data for node ${nodeId}:`, originalData);
                return false;
            }
            
            const shouldGoLeft = featureValue <= threshold;

            // Check if path matches
            if (wentLeft !== shouldGoLeft) {
                return false;
            }
        }
        
        return true;
    }
    
    _buildPathToNode(targetNodeId, rawTreeData) {
        if (!rawTreeData || !Array.isArray(rawTreeData)) {
            console.warn("Invalid raw tree data for path building");
            return [];
        }
        
        // Create lookup map
        const nodeMap = {};
        rawTreeData.forEach(node => {
            nodeMap[node.node_id] = node;
        });
        
        const path = [];
        
        function findPathRecursive(currentNodeId, targetId, currentPath) {
            const node = nodeMap[currentNodeId];
            if (!node) return false;
            
            const newPath = [...currentPath, node];
            
            if (currentNodeId === targetId) {
                path.splice(0, path.length, ...newPath);
                return true;
            }
            
            // Try left child
            if (node.left_child !== null && findPathRecursive(node.left_child, targetId, newPath)) {
                return true;
            }
            
            // Try right child  
            if (node.right_child !== null && findPathRecursive(node.right_child, targetId, newPath)) {
                return true;
            }
            
            return false;
        }
        
        findPathRecursive(0, targetNodeId, []);
        return path;
    }
    
    _getDescendantNodeIds(nodeId, rawTreeData) {
        if (!rawTreeData || !Array.isArray(rawTreeData)) return [];
        
        const nodeMap = {};
        rawTreeData.forEach(node => {
            nodeMap[node.node_id] = node;
        });
        
        const descendants = [];
        
        function collectDescendants(currentNodeId) {
            const node = nodeMap[currentNodeId];
            if (!node) return;
            
            descendants.push(currentNodeId);
            
            if (node.left_child !== null) {
                collectDescendants(node.left_child);
            }
            if (node.right_child !== null) {
                collectDescendants(node.right_child);
            }
        }
        
        collectDescendants(nodeId);
        return descendants;
    }
}
