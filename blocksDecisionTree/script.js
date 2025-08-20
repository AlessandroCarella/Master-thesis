import { initialize, setDataset } from "./jsModules/blocksDecisionTree.js";

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

async function handleDatasetChange(key) {
    setActiveButton(key);
    await setDataset(key);
}

async function init() {
    await initialize("#tree-container");
}

window.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("dataset1-btn")
        .addEventListener("click", () => handleDatasetChange("dataset1"));
    document
        .getElementById("dataset2-btn")
        .addEventListener("click", () => handleDatasetChange("dataset2"));
    document
        .getElementById("dataset3-btn")
        .addEventListener("click", () => handleDatasetChange("dataset3"));
    init();
});