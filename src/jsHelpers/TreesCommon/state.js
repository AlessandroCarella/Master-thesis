export function createTreeState() {
    return {
        treeData: null,
        instanceData: null,
        hierarchyRoot: null,
        instancePath: [], // Added for all trees, used primarily by spawn
    };
}

// Export individual state objects for backward compatibility
export const classicTreeState = createTreeState();

export const blocksTreeState = createTreeState();

export const spawnTreeState = createTreeState();