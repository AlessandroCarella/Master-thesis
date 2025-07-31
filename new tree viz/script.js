import { state } from "./jsModules/state.js";
import { loadDataset, getDatasetFiles } from "./jsModules/dataLoader.js";
import { buildHierarchy, getTreeStats } from "./jsModules/treeModel.js";
import { createVisualization } from "./jsModules/rendering.js";

function setActiveButton(key) {
    document
        .querySelectorAll(".data-button")
        .forEach((btn) => btn.classList.remove("active"));
    const map = {
        dataset1: document.getElementById("dataset1-btn"),
        dataset2: document.getElementById("dataset2-btn"),
        dataset3: document.getElementById("dataset3-btn"),
    };
    map[key]?.classList.add("active");
}

async function setDataset(key) {
    state.currentDataset = key;
    setActiveButton(key);
    await init();
}

async function init() {
    try {
        const { tree, instance } = await loadDataset(state.currentDataset);
        state.treeData = tree;
        state.instanceData = instance;
        state.hierarchyRoot = buildHierarchy(tree);

        createVisualization();
    } catch (error) {
        console.error("Error loading data:", error);
        const container = d3.select("#tree-container");
        container.selectAll("*").remove();
        container
            .append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center")
            .style("height", "100%")
            .style("color", "#ff6b6b")
            .style("font-size", "18px")
            .text(
                `Error loading data files. Please ensure ${getDatasetFiles(
                    state.currentDataset
                )} exist in the ./data/ directory.`
            );
    }
}

window.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("dataset1-btn")
        .addEventListener("click", () => setDataset("dataset1"));
    document
        .getElementById("dataset2-btn")
        .addEventListener("click", () => setDataset("dataset2"));
    document
        .getElementById("dataset3-btn")
        .addEventListener("click", () => setDataset("dataset3"));
    init();
});
