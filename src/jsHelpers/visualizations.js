// visualizations.js - Updated to use new architecture
import { createTreeVisualization } from "./ClassicDecisionTree.js";
import { createScatterPlot } from "./2DScatterPlot.js";
import { createBlocksTreeVisualization } from "./BlocksDecisionTree.js";
import { createTreeSpawnVisualization } from "./TreeSpawnDecisionTree.js";
import {
    showExplanationLoading,
    updateVisualizationUI,
} from "./UIHelpers/explanation.js";
import { getSurrogateParameters, getVisualizationSettings } from "./UIHelpers/featureManagement.js";
import { fetchVisualizationUpdate } from "./API.js";
import { setGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { 
    getExplainedInstance,
    resetVisualizationState
} from "./visualizationConnector.js";
import { 
    highlightInstancePathsForAllTrees,
} from "./visualizationConnectorHelpers/HighlightingCoordinator.js";

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    clearVisualizations();
    createVisualizations(data);
    setupScatterPlotMethodListeners();
    
    // Highlight instance paths after all visualizations are created using new system
    const instance = getExplainedInstance();
    if (instance) {
        // Use unified highlighting system instead of individual tree highlighting
        highlightInstancePathsForAllTrees(instance);
    }
}

function clearVisualizations() {
    // Clear DOM elements
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#classic-tree-plot").selectAll("*").remove();
    d3.select("#blocks-tree-plot").selectAll("*").remove();
    d3.select("#treespawn-tree-plot").selectAll("*").remove();
    // Also remove any tooltips that might be lingering
    d3.selectAll(".decision-tree-tooltip").remove();
    
    // Reset the visualization state tracking and highlighting coordinator
    resetVisualizationState();
}

function createVisualizations(data) {
    const vizSettings = getVisualizationSettings();
    
    // Create blocks tree visualization if enabled
    if (vizSettings.blocksTree) {
        createBlocksTreeVisualization(
            data.decisionTreeVisualizationData,
            data.instance
        );
    }

    // Create classic tree visualization if enabled
    if (vizSettings.classicTree) {
        createTreeVisualization(
            data.decisionTreeVisualizationData,
            data.instance,
            "#classic-tree-plot"
        );
    }

    // Create scatter plot visualization if enabled
    if (vizSettings.scatterPlot) {
        createScatterPlot(
            data.scatterPlotVisualizationData,
            window.treeVisualization,
            "#scatter-plot"
        );
    }

    // Create TreeSpawn tree visualization if enabled
    if (vizSettings.treeSpawn) {
        createTreeSpawnVisualization(
            data.decisionTreeVisualizationData,
            data.instance
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
    
    // Get the current explained instance to preserve it during updates
    const instance = getExplainedInstance();
    
    // Create the updated data object with preserved instance
    const updatedData = {
        decisionTreeVisualizationData: data.decisionTreeVisualizationData,
        scatterPlotVisualizationData: data.scatterPlotVisualizationData,
        instance: instance
    };
    
    createVisualizations(updatedData);
    
    // Highlight instance paths using new unified system
    if (instance) {
        highlightInstancePathsForAllTrees(instance);
    }
}