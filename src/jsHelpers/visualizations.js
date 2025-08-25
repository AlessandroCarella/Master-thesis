import { createTreeVisualization } from "./ClassicDecisionTree.js";
import { createScatterPlot } from "./2DScatterPlot.js";
import { createBlocksTreeVisualization } from "./BlocksDecisionTree.js";
import { createTreeSpawnVisualization } from "./TreeSpawnDecisionTree.js";
import {
    showExplanationLoading,
    updateVisualizationUI,
} from "./UIHelpers/explanation.js";
import { getSurrogateParameters } from "./ui.js";
import { fetchVisualizationUpdate } from "./API.js";
import { setGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { 
    highlightInstancePathInTree, 
    highlightInstancePathInBlocksTree,
    highlightInstancePathInTreeSpawn,
    getExplainedInstance
} from "./visualizationConnector.js";

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    clearVisualizations();
    createVisualizations(data);
    setupScatterPlotMethodListeners();
    
    // Highlight instance paths after all visualizations are created
    const instance = getExplainedInstance();
    if (instance) {
        highlightInstancePathInTree(instance);
        highlightInstancePathInBlocksTree(instance);
        highlightInstancePathInTreeSpawn(instance);
    }
}

function clearVisualizations() {
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#classic-tree-plot").selectAll("*").remove();
    d3.select("#blocks-tree-plot").selectAll("*").remove();
    d3.select("#treespawn-tree-plot").selectAll("*").remove();
    // Also remove any tooltips that might be lingering
    d3.selectAll(".decision-tree-tooltip").remove();
}

function createVisualizations(data) {    
    // Create classic tree visualization
    createTreeVisualization(
        data.decisionTreeVisualizationData,
        data.instance,
        "#classic-tree-plot"
    );

    // Create scatter plot visualization
    createScatterPlot(
        data.scatterPlotVisualizationData,
        window.treeVisualization,
        "#scatter-plot"
    );

    // Create blocks tree visualization
    createBlocksTreeVisualization(
        data.decisionTreeVisualizationData,
        data.instance
    );

    // Create TreeSpawn tree visualization (without automatic instance path highlighting)
    createTreeSpawnVisualization(
        data.decisionTreeVisualizationData,
        data.instance
    );
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
    
    if (instance) {
        highlightInstancePathInTree(instance);
        highlightInstancePathInBlocksTree(instance);
        highlightInstancePathInTreeSpawn(instance);
    }
}