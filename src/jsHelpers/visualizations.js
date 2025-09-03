// visualizations.js - Updated to handle encoded categorical features
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
    resetVisualizationState,
    setExplainedInstance
} from "./visualizationConnector.js";
import { 
    highlightInstancePathsForAllTrees,
} from "./visualizationConnectorHelpers/HighlightingCoordinator.js";

// Updated to handle encoded instance data properly
export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    // Clear previous visualizations    
    clearVisualizations();
    
    // Store feature mapping info if provided
    if (data.featureMappingInfo) {
        window.currentFeatureMappingInfo = data.featureMappingInfo;
    }

    // Determine which instance to use for tree operations
    // Priority: encodedInstance > originalInstance > fallback to last scatter plot data point
    const instanceForTrees = data.encodedInstance || 
                            data.originalInstance || 
                            (data.scatterPlotVisualizationData?.originalData?.length > 0 ? 
                             data.scatterPlotVisualizationData.originalData[data.scatterPlotVisualizationData.originalData.length - 1] : 
                             null);

    if (!instanceForTrees) {
        console.warn("No instance data available for tree path highlighting");
    }

    // Create visualizations with the appropriate instance
    createVisualizations({
        decisionTreeVisualizationData: data.decisionTreeVisualizationData,
        scatterPlotVisualizationData: data.scatterPlotVisualizationData,
        instance: instanceForTrees,  // Use encoded instance for tree operations
        encodedInstance: data.encodedInstance,
        originalInstance: data.originalInstance
    });
    
    setupScatterPlotMethodListeners();
    
    // Set explained instance in the coordinator (use encoded for tree operations)
    if (instanceForTrees) {
        setExplainedInstance(instanceForTrees, data.originalInstance);
        
        // Use unified highlighting system with encoded instance
        try {
            highlightInstancePathsForAllTrees(instanceForTrees);
        } catch (error) {
            console.error("Error applying instance path highlighting:", error);
        }
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
        try {
            createBlocksTreeVisualization(
                data.decisionTreeVisualizationData,
                data.instance  // Use encoded instance
            );
        } catch (error) {
            console.error("Error creating blocks tree visualization:", error);
        }
    }

    // Create classic tree visualization if enabled
    if (vizSettings.classicTree) {
        try {
            createTreeVisualization(
                data.decisionTreeVisualizationData,
                data.instance,  // Use encoded instance
                "#classic-tree-plot"
            );
        } catch (error) {
            console.error("Error creating classic tree visualization:", error);
        }
    }

    // Create scatter plot visualization if enabled
    if (vizSettings.scatterPlot) {
        try {
            createScatterPlot(
                data.scatterPlotVisualizationData,
                window.treeVisualization,
                "#scatter-plot"
            );
        } catch (error) {
            console.error("Error creating scatter plot visualization:", error);
        }
    }

    // Create TreeSpawn tree visualization if enabled
    if (vizSettings.treeSpawn) {
        try {
            createTreeSpawnVisualization(
                data.decisionTreeVisualizationData,
                data.instance  // Use encoded instance
            );
        } catch (error) {
            console.error("Error creating TreeSpawn visualization:", error);
        }
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
    // This should be the encoded instance for proper tree path tracing
    const currentEncodedInstance = getExplainedInstance();
    const currentOriginalInstance = window.currentOriginalInstance;
    
    // Create the updated data object with preserved encoded instance
    const updatedData = {
        decisionTreeVisualizationData: data.decisionTreeVisualizationData,
        scatterPlotVisualizationData: data.scatterPlotVisualizationData,
        instance: currentEncodedInstance,  // Use encoded instance
        encodedInstance: currentEncodedInstance,
        originalInstance: currentOriginalInstance
    };
    
    createVisualizations(updatedData);
    
    // Highlight instance paths using new unified system with encoded instance
    if (currentEncodedInstance) {
        try {
            highlightInstancePathsForAllTrees(currentEncodedInstance);
        } catch (error) {
            console.error("Error applying instance path highlighting after update:", error);
        }
    }
}
