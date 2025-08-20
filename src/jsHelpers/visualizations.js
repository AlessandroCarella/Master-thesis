import { createTreeVisualization } from "./ClassicDecisionTree.js";
import { createScatterPlot } from "./2DScatterPlot.js";
import {
    showExplanationLoading,
    updateVisualizationUI,
} from "./UIHelpers/explanation.js";
import { getSurrogateParameters } from "./ui.js";
import { fetchVisualizationUpdate } from "./API.js";
import { setGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";

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
        
        // Update colors with the new method before updating visualizations
        setGlobalColorMap(result.uniqueClasses);
        
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
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: selectedMethod,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
    };
}

function updateVisualizations(data) {
    clearVisualizations();
    createVisualizations(data);
}
