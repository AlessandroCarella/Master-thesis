// HighlightingCoordinator.js - Central coordination for all highlighting
import { TreeHandlerFactory } from "./TreeHandlers.js";
import { ScatterPlotHighlighter } from "./ScatterPlotHighlighter.js";
import { TREES_SETTINGS } from "../TreesCommon/settings.js";

class HighlightingCoordinator {
    constructor() {
        this.treeHandlers = new Map();
        this.scatterPlotHighlighter = null;
        this.selectedNode = null;
        this.explainedInstance = null;
    }
    
    registerTreeHandler(treeKind, visualization) {
        const handler = TreeHandlerFactory.create(treeKind, visualization);
        this.treeHandlers.set(treeKind, handler);
        
        // Automatically apply instance path highlighting if explained instance exists
        const explainedInstance = this.getExplainedInstance();
        if (explainedInstance) {
            this._applyInstancePathHighlighting(handler, explainedInstance);
        }
    }
    
    setExplainedInstance(instance) {
        this.explainedInstance = instance;
        
        // Apply instance path highlighting to all registered trees
        if (instance) {
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, instance);
            });
        }
    }
    
    getExplainedInstance() {
        return this.explainedInstance;
    }
    
    _applyInstancePathHighlighting(handler, instance) {
        try {
            const path = handler.findPath(instance);
            if (path.length > 1) {
                handler.highlightInstancePath(path);
            }
        } catch (error) {
            console.warn(`Error applying instance path highlighting for ${handler.treeKind}:`, error);
        }
    }
    
    registerScatterPlotHighlighter(scatterPlotVisualization) {
        this.scatterPlotHighlighter = new ScatterPlotHighlighter(scatterPlotVisualization);
    }
    
    setOriginalPointsNeighPointsBoolArray(array) {
        if (this.scatterPlotHighlighter) {
            this.scatterPlotHighlighter.setOriginalPointsNeighPointsBoolArray(array);
        }
    }
    
    getOriginalPointsNeighPointsBoolArrayValAti(index) {
        return this.scatterPlotHighlighter?.getOriginalPointsNeighPointsBoolArrayValAti(index) ?? true;
    }
    
    coordinateHighlighting(nodeId, isLeaf, sourceTreeType = null) {
        // Deselect if clicking the already selected node
        if (this.selectedNode === nodeId) {
            this.resetAllHighlights();
            this.selectedNode = null;
            return;
        }

        // Reset all highlights and select new node
        this.resetAllHighlights();
        this.selectedNode = nodeId;

        // Highlight in all available trees
        if (isLeaf) {
            this._highlightLeafAcrossAllTrees(nodeId);
        } else {
            this._highlightSplitNodeAcrossAllTrees(nodeId);
        }
    }
    
    resetAllHighlights() {
        // Reset interactive highlights but preserve instance path highlights
        this.treeHandlers.forEach(handler => {
            handler.resetHighlights();
        });
        this.scatterPlotHighlighter?.resetHighlights();
        this.selectedNode = null;
        
        // Reapply instance path highlighting if explained instance exists
        if (this.explainedInstance) {
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, this.explainedInstance);
            });
        }
    }
    
    clearInstancePathHighlighting() {
        this.treeHandlers.forEach(handler => {
            try {
                // Remove instance path highlights from each tree
                if (handler.visualization?.contentGroup) {
                    // Classic tree
                    handler.visualization.contentGroup.selectAll(".link-highlight").remove();
                    handler.visualization.contentGroup
                        .selectAll(".link.instance-path")
                        .classed("instance-path", false);
                } else if (handler.visualization?.container) {
                    // Blocks and Spawn trees
                    handler.visualization.container.selectAll(".link-highlight").remove();
                    handler.visualization.container.selectAll(".instance-path-background").remove();
                    handler.visualization.container
                        .selectAll(".link.instance-path")
                        .classed("instance-path", false);
                }
            } catch (error) {
                console.warn(`Error clearing instance path highlighting for ${handler.treeKind}:`, error);
            }
        });
    }
    
    refreshInstancePathHighlighting() {
        if (this.explainedInstance) {
            this.clearInstancePathHighlighting();
            this.treeHandlers.forEach(handler => {
                this._applyInstancePathHighlighting(handler, this.explainedInstance);
            });
        }
    }
    
    highlightInstancePaths(instance) {
        if (!instance) return;
        
        this.treeHandlers.forEach((handler, treeKind) => {
            try {
                const path = handler.findPath(instance);
                if (path.length > 0) {
                    handler.highlightPath(path);
                }
            } catch (error) {
                console.warn(`Error highlighting instance path for ${treeKind}:`, error);
            }
        });
    }
    
    _highlightLeafAcrossAllTrees(nodeId) {
        // Highlight in all tree handlers
        this.treeHandlers.forEach(handler => {
            try {
                const pathToNode = this._getPathToNode(nodeId, handler);
                if (pathToNode.length > 0) {
                    handler.highlightPath(pathToNode);
                } else {
                    handler.highlightNode(nodeId);
                }
            } catch (error) {
                console.warn(`Error highlighting leaf in tree:`, error);
            }
        });
        
        // Highlight scatter plot points
        if (this.scatterPlotHighlighter) {
            const rawTreeData = this._getRawTreeData();
            if (rawTreeData) {
                this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
            }
        }
    }
    
    _highlightSplitNodeAcrossAllTrees(nodeId) {
        // Highlight in all tree handlers
        this.treeHandlers.forEach(handler => {
            try {
                const pathToNode = this._getPathToNode(nodeId, handler);
                if (pathToNode.length > 0) {
                    handler.highlightPath(pathToNode);
                }
                handler.highlightDescendants(nodeId);
            } catch (error) {
                console.warn(`Error highlighting split node in tree:`, error);
            }
        });
        
        // Highlight scatter plot points for descendants
        if (this.scatterPlotHighlighter) {
            const rawTreeData = this._getRawTreeData();
            if (rawTreeData) {
                this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
            }
        }
    }
    
    _getPathToNode(nodeId, handler) {
        // Try to get path to node (different for each tree type)
        try {
            if (handler.treeKind === TREES_SETTINGS.treeKindID.classic) {
                return this._getClassicTreePathToNode(nodeId, handler);
            } else if (handler.treeKind === TREES_SETTINGS.treeKindID.blocks) {
                return this._getBlocksTreePathToNode(nodeId, handler);
            } else if (handler.treeKind === TREES_SETTINGS.treeKindID.spawn) {
                return this._getSpawnTreePathToNode(nodeId, handler);
            }
        } catch (error) {
            console.warn(`Error getting path to node ${nodeId}:`, error);
        }
        return [];
    }
    
    _getClassicTreePathToNode(nodeId, handler) {
        const node = handler.getNodeById(nodeId);
        if (!node) return [];
        
        const path = [];
        let current = node;
        while (current) {
            path.unshift(current.data.node_id);
            current = current.parent;
        }
        return path;
    }
    
    _getBlocksTreePathToNode(nodeId, handler) {
        // Use the blocks tree specific path finding
        const allPaths = handler.visualization?.allPaths || [];
        
        for (const path of allPaths) {
            const nodeIndex = path.indexOf(nodeId);
            if (nodeIndex !== -1) {
                return path.slice(0, nodeIndex + 1);
            }
        }
        
        return [];
    }
    
    _getSpawnTreePathToNode(nodeId, handler) {
        // For spawn tree, use the instance path if available
        if (handler.state.instancePath?.includes(nodeId)) {
            const nodeIndex = handler.state.instancePath.indexOf(nodeId);
            return handler.state.instancePath.slice(0, nodeIndex + 1);
        }
        
        // Fallback to raw tree data path finding
        if (!handler.state.treeData) return [];

        const nodesById = {};
        handler.state.treeData.forEach(node => {
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
    
    _getRawTreeData() {
        // Get raw tree data from any available handler
        for (const [treeKind, handler] of this.treeHandlers) {
            if (handler.visualization?.rawTreeData) {
                return handler.visualization.rawTreeData;
            }
            if (handler.state?.treeData) {
                return handler.state.treeData;
            }
        }
        return null;
    }
    
    // Legacy compatibility methods
    highlightPointsForLeaf(leafNode, scatterPlotVis) {
        if (this.scatterPlotHighlighter && scatterPlotVis) {
            // Extract node ID from legacy leafNode structure
            const nodeId = leafNode?.data?.node_id;
            if (nodeId) {
                const rawTreeData = this._getRawTreeData();
                if (rawTreeData) {
                    this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
                }
            }
        }
    }
    
    highlightPointsForDescendants(node, scatterPlotVis) {
        if (this.scatterPlotHighlighter && scatterPlotVis) {
            const nodeId = node?.data?.node_id;
            if (nodeId) {
                const rawTreeData = this._getRawTreeData();
                if (rawTreeData) {
                    this.scatterPlotHighlighter.highlightPointsForNode(nodeId, rawTreeData);
                }
            }
        }
    }
}

// Create singleton instance
export const highlightingCoordinator = new HighlightingCoordinator();

// Export convenience functions for backward compatibility
export function coordinateHighlightingAcrossAllTrees(nodeId, isLeaf, sourceTreeType) {
    highlightingCoordinator.coordinateHighlighting(nodeId, isLeaf, sourceTreeType);
}

export function setOriginalPointsNeighPointsBoolArray(array) {
    highlightingCoordinator.setOriginalPointsNeighPointsBoolArray(array);
}

// Tree registration functions
export function registerClassicTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.classic, visualization);
}

export function registerBlocksTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.blocks, visualization);
}

export function registerSpawnTree(visualization) {
    highlightingCoordinator.registerTreeHandler(TREES_SETTINGS.treeKindID.spawn, visualization);
}

export function registerScatterPlot(visualization) {
    highlightingCoordinator.registerScatterPlotHighlighter(visualization);
}

export function highlightInstancePathsForAllTrees(instance) {
    highlightingCoordinator.setExplainedInstance(instance);
}
