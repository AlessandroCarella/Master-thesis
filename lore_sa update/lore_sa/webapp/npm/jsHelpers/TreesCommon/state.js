/**
 * @fileoverview Global state management for tree visualizations.
 * Provides centralized state containers for different tree types with consistent data structure and access patterns.
 * @author Generated documentation
 * @module TreeState
 */

import { TREES_SETTINGS } from "./settings.js"

/**
 * @typedef {Object} TreeState
 * @property {Array<Object>|null} treeData - Raw tree node data from backend
 * @property {Object|null} instanceData - Instance data for path highlighting
 * @property {Object|null} hierarchyRoot - Processed D3 hierarchy structure
 * @property {Array<number>} instancePath - Cached instance path node IDs
 * @property {Object|null} featureMappingInfo - Feature encoding/decoding information
 */

/**
 * Creates a new tree state object with default values.
 * Provides consistent state structure across all tree visualization types.
 * 
 * @returns {TreeState} New tree state object with null/empty defaults
 * @example
 * const newState = createTreeState();
 * // Returns: { treeData: null, instanceData: null, hierarchyRoot: null, instancePath: [], featureMappingInfo: null }
 * 
 * @example
 * // Used internally to initialize specific tree states
 * const classicState = createTreeState();
 * classicState.treeData = rawTreeData;
 */
export function createTreeState() {
    return {
        /**
         * Raw tree node data as received from backend
         * @type {Array<Object>|null}
         */
        treeData: null,
        
        /**
         * Instance data for path tracing and highlighting
         * @type {Object|null}
         */
        instanceData: null,
        
        /**
         * Processed hierarchy structure for visualization
         * @type {Object|null}
         */
        hierarchyRoot: null,
        
        /**
         * Cached path of node IDs for instance traversal
         * @type {Array<number>}
         */
        instancePath: [],
        
        /**
         * Feature mapping information for encoding/decoding
         * @type {Object|null}
         */
        featureMappingInfo: null,
    };
}

/**
 * Global state container for classic tree visualization.
 * Maintains all data needed for classic hierarchical tree rendering and interaction.
 * 
 * @type {TreeState}
 * @example
 * // Set tree data
 * classicTreeState.treeData = backendTreeData;
 * 
 * @example
 * // Access instance path
 * const path = classicTreeState.instancePath;
 * 
 * @see createTreeState
 */
export const classicTreeState = createTreeState();

/**
 * Global state container for blocks tree visualization.
 * Maintains all data needed for rectangular blocks tree rendering and interaction.
 * 
 * @type {TreeState}
 * @example
 * // Set hierarchy root
 * blocksTreeState.hierarchyRoot = d3HierarchyRoot;
 * 
 * @example
 * // Check if data is loaded
 * if (blocksTreeState.treeData) {
 *   // Process blocks tree
 * }
 * 
 * @see createTreeState
 */
export const blocksTreeState = createTreeState();

/**
 * Global state container for spawn tree visualization.
 * Maintains all data needed for spawn-style tree rendering with expand/collapse functionality.
 * 
 * @type {TreeState}
 * @example
 * // Set instance data and path
 * spawnTreeState.instanceData = encodedInstance;
 * spawnTreeState.instancePath = [0, 1, 3, 7];
 * 
 * @example
 * // Access feature mapping
 * const mappingInfo = spawnTreeState.featureMappingInfo;
 * 
 * @see createTreeState
 */
export const spawnTreeState = createTreeState();

/**
 * Gets the appropriate state object based on tree type identifier.
 * Provides centralized access to tree-specific state containers with fallback handling.
 * 
 * @param {string|number} treeKind - Tree type identifier from TREES_SETTINGS.treeKindID
 * @returns {TreeState} Appropriate tree state object
 * @example
 * const state = getTreeState(TREES_SETTINGS.treeKindID.classic);
 * // Returns: classicTreeState
 * 
 * @example
 * const spawnState = getTreeState(TREES_SETTINGS.treeKindID.spawn);
 * spawnState.instancePath = [0, 1, 3];
 * 
 * @example
 * // Unknown tree kind falls back to classic
 * const fallbackState = getTreeState('unknown');
 * // Returns: classicTreeState (with warning)
 * 
 * @see TREES_SETTINGS.treeKindID
 * @see classicTreeState
 * @see blocksTreeState
 * @see spawnTreeState
 */
export function getTreeState(treeKind) {
    switch (treeKind) {
        case TREES_SETTINGS.treeKindID.classic:
            return classicTreeState;
        case TREES_SETTINGS.treeKindID.blocks:
            return blocksTreeState;
        case TREES_SETTINGS.treeKindID.spawn:
            return spawnTreeState;
        default:
            console.warn(
                `Unknown tree kind: ${treeKind}, defaulting to classic`
            );
            return classicTreeState;
    }
}
