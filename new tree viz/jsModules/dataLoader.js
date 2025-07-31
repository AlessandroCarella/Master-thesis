import { state } from "./state.js";

export function getDatasetFiles(dataset) {
    if (dataset === "dataset1") return "tree.json and instance.json";
    if (dataset === "dataset2") return "tree2.json and instance2.json";
    if (dataset === "dataset3") return "tree3.json and instance3.json";
    return "the required data files";
}

export async function loadDataset(datasetKey) {
    let treeFile, instanceFile;

    if (datasetKey === "dataset1") {
        treeFile = "./data/tree.json";
        instanceFile = "./data/instance.json";
    } else if (datasetKey === "dataset2") {
        treeFile = "./data/tree2.json";
        instanceFile = "./data/instance2.json";
    } else if (datasetKey === "dataset3") {
        treeFile = "./data/tree3.json";
        instanceFile = "./data/instance3.json";
    } else {
        throw new Error(`Unknown dataset key: ${datasetKey}`);
    }

    const [tree, instance] = await Promise.all([
        d3.json(treeFile),
        d3.json(instanceFile),
    ]);

    return { tree, instance };
}
