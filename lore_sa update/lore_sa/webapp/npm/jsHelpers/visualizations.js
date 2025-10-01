/**
 * @fileoverview Visualization initialization and management for decision tree and scatter plot displays.
 * Handles encoded categorical features and coordinates between different visualization types.
 * @author Generated documentation
 * @module Visualizations
 */

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
import { initializeColors, setGlobalColorMap } from "./visualizationConnectorHelpers/colors.js";
import { 
    getExplainedInstance,
    resetVisualizationState,
    setExplainedInstance
} from "./visualizationConnector.js";
import { 
    highlightInstancePathsForAllTrees,
} from "./visualizationConnectorHelpers/HighlightingCoordinator.js";

/**
 * @typedef {Object} VisualizationData
 * @property {Object} decisionTreeVisualizationData - Tree structure data
 * @property {Object} scatterPlotVisualizationData - Scatter plot data
 * @property {Object} [encodedInstance] - Encoded instance for tree operations
 * @property {Object} [originalInstance] - Original instance for reference
 * @property {Object} [featureMappingInfo] - Feature encoding mapping information
 */

/**
 * Initializes all visualization components with provided data.
 * Handles encoded instance data properly for tree path highlighting.
 * 
 * @param {VisualizationData} data - Complete visualization data package
 * @throws {Error} When visualization data is invalid or missing
 * @example
 * initializeVisualizations({
 *   decisionTreeVisualizationData: treeData,
 *   scatterPlotVisualizationData: scatterData,
 *   encodedInstance: { feature1_A: 1, feature2: 0.5 },
 *   originalInstance: { feature1: 'A', feature2: 0.5 }
 * });
 * 
 * @see createVisualizations
 * @see highlightInstancePathsForAllTrees
 */
export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    clearVisualizations();
    
    if (data.featureMappingInfo) {
        window.currentFeatureMappingInfo = data.featureMappingInfo;
    }

    const instanceForTrees = data.encodedInstance || 
                            data.originalInstance || 
                            (data.scatterPlotVisualizationData?.originalData?.length > 0 ? 
                             data.scatterPlotVisualizationData.originalData[data.scatterPlotVisualizationData.originalData.length - 1] : 
                             null);

    if (!instanceForTrees) {
        console.warn("No instance data available for tree path highlighting");
    }

    createVisualizations({
        decisionTreeVisualizationData: data.decisionTreeVisualizationData,
        scatterPlotVisualizationData: data.scatterPlotVisualizationData,
        instance: instanceForTrees,
        encodedInstance: data.encodedInstance,
        originalInstance: data.originalInstance
    });
    
    setupScatterPlotMethodListeners();
    
    if (instanceForTrees) {
        setExplainedInstance(instanceForTrees, data.originalInstance);
        
        try {
            highlightInstancePathsForAllTrees(instanceForTrees);
        } catch (error) {
            console.error("Error applying instance path highlighting:", error);
        }
    }
}

/**
 * Clears all existing visualizations from the DOM and resets state.
 * Removes tooltips and resets visualization state tracking.
 * 
 * @example
 * clearVisualizations();
 * // All visualization containers cleared
 * 
 * @see resetVisualizationState
 */
function clearVisualizations() {
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#classic-tree-plot").selectAll("*").remove();
    d3.select("#blocks-tree-plot").selectAll("*").remove();
    d3.select("#treespawn-tree-plot").selectAll("*").remove();
    d3.selectAll(".decision-tree-tooltip").remove();
    
    resetVisualizationState();
}

/**
 * Creates visualizations based on enabled settings and provided data.
 * Uses encoded instance data for proper tree path highlighting.
 * 
 * @param {Object} data - Visualization data with instance information
 * @param {Object} data.decisionTreeVisualizationData - Tree data
 * @param {Object} data.scatterPlotVisualizationData - Scatter plot data  
 * @param {Object} data.instance - Instance data for trees (should be encoded)
 * @param {Object} [data.encodedInstance] - Encoded instance data
 * @param {Object} [data.originalInstance] - Original instance data
 * @example
 * createVisualizations({
 *   decisionTreeVisualizationData: treeData,
 *   scatterPlotVisualizationData: scatterData,
 *   instance: encodedInstance
 * });
 * 
 * @see getVisualizationSettings
 */
function createVisualizations(data) {
    const vizSettings = getVisualizationSettings();

    if (vizSettings.blocksTree) {
        try {
            createBlocksTreeVisualization(
                data.decisionTreeVisualizationData,
                data.instance
            );
        } catch (error) {
            console.error("Error creating blocks tree visualization:", error);
        }
    }

    if (vizSettings.classicTree) {
        try {
            createTreeVisualization(
                data.decisionTreeVisualizationData,
                data.instance,
                "#classic-tree-plot"
            );
        } catch (error) {
            console.error("Error creating classic tree visualization:", error);
        }
    }

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

    if (vizSettings.treeSpawn) {
        try {
            createTreeSpawnVisualization(
                data.decisionTreeVisualizationData,
                data.instance
            );
        } catch (error) {
            console.error("Error creating TreeSpawn visualization:", error);
        }
    }
}

/**
 * Sets up event listeners for scatter plot method selection radio buttons.
 * Handles dynamic switching between different dimensionality reduction methods.
 * 
 * @example
 * setupScatterPlotMethodListeners();
 * // Radio button listeners configured for method changes
 * 
 * @see handleScatterPlotMethodChange
 */
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

/**
 * Handles scatter plot method change events and updates visualizations.
 * Fetches new data and refreshes displays with the selected method.
 * 
 * @async
 * @param {Event} event - Change event from radio button
 * @throws {Error} When visualization update fails
 * @example
 * // Automatically called when radio button changes
 * // Updates scatter plot from PCA to UMAP
 * 
 * @see fetchVisualizationUpdate
 * @see updateVisualizations
 */
async function handleScatterPlotMethodChange(event) {
    if (!event.target.checked) return;

    showExplanationLoading();
    try {
        const requestData = buildVisualizationRequestData(event.target.value);
        const result = await fetchVisualizationUpdate(requestData);

        await initializeColors(event.target.value);
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

/**
 * Builds request data for visualization updates.
 * Combines selected method with current surrogate parameters and all Dimensionality 
 * Reduction techniques Parameters.
 * 
 * @param {string} selectedMethod - Selected dimensionality reduction method
 * @returns {Object} Request data for API call
 * @example
 * const requestData = buildVisualizationRequestData('umap');
 * // Returns: { dataset_name: 'iris', scatterPlotMethod: 'umap', allMethodParameters: {...}, ... }
 * 
 * @see getSurrogateParameters
 * @see getAllDimensionalityReductionParameters
 */
function buildVisualizationRequestData(selectedMethod) {
    const surrogateParams = getSurrogateParameters();
    
    // Update stored parameters with current UI values
    if (window.updateDimensionalityReductionParameters) {
        window.updateDimensionalityReductionParameters();
    }
    
    const allMethodParams = window.appState.dimensionalityReductionParameters || {};
    const methodSpecificParams = allMethodParams[selectedMethod.toUpperCase()] || {};
    
    return {
        dataset_name: window.appState.dataset_name,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: selectedMethod,
        dimensionalityReductionMethod: selectedMethod,
        dimensionalityReductionParameters: methodSpecificParams,
        allMethodParameters: allMethodParams,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
    };
}

/**
 * Updates visualizations with new data while preserving instance highlighting.
 * Clears existing visualizations and recreates them with updated data.
 * 
 * @param {Object} data - Updated visualization data
 * @param {Object} data.decisionTreeVisualizationData - Updated tree data
 * @param {Object} data.scatterPlotVisualizationData - Updated scatter plot data
 * @example
 * updateVisualizations({
 *   decisionTreeVisualizationData: newTreeData,
 *   scatterPlotVisualizationData: newScatterData
 * });
 * 
 * @see clearVisualizations
 * @see createVisualizations
 * @see highlightInstancePathsForAllTrees
 */
function updateVisualizations(data) {
    clearVisualizations();
    
    const currentEncodedInstance = getExplainedInstance();
    const currentOriginalInstance = window.currentOriginalInstance;
    
    const updatedData = {
        decisionTreeVisualizationData: data.decisionTreeVisualizationData,
        scatterPlotVisualizationData: data.scatterPlotVisualizationData,
        instance: currentEncodedInstance,
        encodedInstance: currentEncodedInstance,
        originalInstance: currentOriginalInstance
    };
    
    createVisualizations(updatedData);
    
    if (currentEncodedInstance) {
        try {
            highlightInstancePathsForAllTrees(currentEncodedInstance);
        } catch (error) {
            console.error("Error applying instance path highlighting after update:", error);
        }
    }
}
