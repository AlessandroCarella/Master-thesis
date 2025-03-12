import { createTreeVisualization } from "./DecisionTree.js";
import { createScatterPlot } from "./scatterPlot.js";
import {
    buildExplanationRequestData,
    showExplanationLoading,
    updateVisualizationUI,
} from "./UIHelpers/explanation.js";
import { getFeatureValues, getSurrogateParameters } from "./ui.js";
import { fetchExplanation, fetchVisualizationUpdate } from "./API.js";

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    clearVisualizations();
    createVisualizations(data);
    setupScatterPlotMethodListeners();
}

function clearVisualizations() {
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#tree-plot").selectAll("*").remove();
}

function createVisualizations(data) {
    if (data.decisionTreeVisualizationData) {
        createTreeVisualization(
            data.decisionTreeVisualizationData,
            data.instance
        );
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
        const requestData = buildVisualizationRequestData(event.target.value);
        const result = await fetchVisualizationUpdate(requestData);
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

function buildVisualizationRequestData(selectedMethod) {
    const surrogateParams = getSurrogateParameters();
    return {
        dataset_name: window.appState.dataset_name,
        scatterPlotStep: surrogateParams.scatterPlotStep || 0.1,
        scatterPlotMethod: selectedMethod,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
    };
}

function updateVisualizations(data) {
    clearVisualizations();
    createVisualizations(data);
}
