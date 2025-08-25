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

// Get state object based on tree type
export function getTreeState(treeKind) {
    switch (treeKind) {
        case "classic":
            return classicTreeState;
        case "blocks":
            return blocksTreeState;
        case "spawn":
            return spawnTreeState;
        default:
            console.warn(
                `Unknown tree kind: ${treeKind}, defaulting to classic`
            );
            return classicTreeState;
    }
}