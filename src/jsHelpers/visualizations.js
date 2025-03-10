import { createVisualization } from "./DecisionTree.js";
import { createScatterPlot } from "./scatterPlot.js";
import {
    buildExplanationRequestData,
    showExplanationLoading,
    updateVisualizationUI,
} from "./UIHelpers/explanation.js";
import { getFeatureValues, getSurrogateParameters } from "./ui.js";
import { fetchExplanation } from "./API.js";

// Store current visualization data for reuse when changing plot method
let currentVisualizationData = null;

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    currentVisualizationData = data;
    clearVisualizations();
    createVisualizations(data);
    setupScatterPlotMethodListeners();
}

function clearVisualizations() {
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#visualization").selectAll("*").remove();
}

function createVisualizations(data) {
    if (data.decisionTreeVisualizationData) {
        createVisualization(data.decisionTreeVisualizationData);
    }
    if (data.scatterPlotVisualizationData) {
        createScatterPlot(
            data.scatterPlotVisualizationData,
            "#scatter-plot",
            window.treeVisualization
        );
    }
}

export function setupScatterPlotMethodListeners() {
    document
        .querySelectorAll('input[name="scatterPlotMethod"]')
        .forEach((radioButton) => {
            radioButton.addEventListener(
                "change",
                handleScatterPlotMethodChange
            );
        });
}

async function handleScatterPlotMethodChange(event) {
    if (!event.target.checked) return;

    showExplanationLoading();
    try {
        const requestData = buildRequestData(event.target.value);
        const result = await fetchExplanation(requestData);
        updateVisualizationUI();
        document.querySelector(
            `input[name="scatterPlotMethod"][value="${event.target.value}"]`
        ).checked = true;
        updateVisualizations(result);
    } catch (error) {
        console.error("Failed to update scatter plot method:", error);
        updateVisualizationUI();
    }
}

function buildRequestData(selectedMethod) {
    const instanceData = getFeatureValues();
    const surrogateParams = getSurrogateParameters();
    const requestData = buildExplanationRequestData(
        instanceData,
        surrogateParams,
        window.appState
    );
    requestData.scatterPlotMethod = selectedMethod;
    return requestData;
}

function updateVisualizations(data) {
    clearVisualizations();
    createVisualizations(data);
}
