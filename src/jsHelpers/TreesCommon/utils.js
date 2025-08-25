import { classicTreeState, blocksTreeState, spawnTreeState } from "./state.js";

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