/********************************************
 *               IMPORTS
 ********************************************/
import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
    getSurrogateParameters,
    getVisualizationSettings,
    createFeatureInputs,
    getFeatureValues,
    resetFeatures,
    setState,
} from "./jsHelpers/ui.js";

import { initializeVisualizations } from "./jsHelpers/visualizations.js";
import { updateParameter, loadingState } from "./jsHelpers/stateManagement.js";
import {
    setExplainedInstance,
    resetVisualizationState,
} from "./jsHelpers/visualizationConnector.js";

// Import helper functions
import {
    fetchDatasets,
    fetchClassifiers,
    fetchDatasetInfo,
    fetchClassifierParameters,
    trainModel,
    fetchExplanation,
    getSampleInstance,
} from "./jsHelpers/API.js";

import {
    resetUIDatasetSelection,
    resetUISelectClassifier,
    resetUIstartTraining,
} from "./jsHelpers/UIHelpers/reset.js";

import {
    closeDatasetPanelIfVisible,
    showDatasetLoading,
    updateDatasetInfoPanel,
    handleDatasetInfoError,
    attachDatasetPanelEventListeners,
} from "./jsHelpers/UIHelpers/dataset.js";

import {
    showTrainingLoading,
    buildTrainingData,
    updateUIAfterTraining,
} from "./jsHelpers/UIHelpers/training.js";

import {
    showExplanationLoading,
    buildExplanationRequestData,
    updateVisualizationUI,
} from "./jsHelpers/UIHelpers/explanation.js";

import { scrollToElement } from "./jsHelpers/scroll.js";
import { initializeColors, setGlobalColorMap } from "./jsHelpers/visualizationConnectorHelpers/colors.js";
import { checkCustomData } from "./jsHelpers/API.js";

/********************************************
 *            GLOBAL STATE
 ********************************************/
export const appState = {
    dataset_name: null,
    selectedClassifier: null,
    parameters: {},
    featureDescriptor: null,
};

/********************************************
 *           EVENT HANDLERS
 ********************************************/

// Handle dataset selection.
window.selectDataset = async function (datasetName) {
    // Prevent multiple concurrent requests
    if (loadingState.isLoading) return;

    loadingState.setLoading(true);

    closeDatasetPanelIfVisible();
    resetUIDatasetSelection(appState);
    appState.dataset_name = datasetName;

    // Hide dataset info panel until data is loaded
    const datasetInfoDiv = document.getElementById("datasetInfo");
    datasetInfoDiv.style.display = "none";

    try {
        showDatasetLoading();
        const datasetInfo = await fetchDatasetInfo(datasetName);

        updateDatasetInfoPanel(datasetName, datasetInfo);

        const classifiers = await fetchClassifiers();
        populateClassifierGrid(classifiers);
        const classifierSection = document.getElementById("classifierSection");
        classifierSection.style.display = "block";

        // Add scroll to show the newly displayed section
        scrollToElement(classifierSection);

        // Re-attach event listeners if needed.
        attachDatasetPanelEventListeners();
    } catch (error) {
        handleDatasetInfoError(datasetName, error);
    } finally {
        loadingState.setLoading(false);
    }
};

// Handle classifier selection.
window.selectClassifier = async (classifierName) => {
    // Prevent multiple concurrent requests
    if (loadingState.isLoading) return;

    loadingState.setLoading(true);

    try {
        resetUISelectClassifier(appState);
        const data = await fetchClassifierParameters();
        const parameters = data.classifiers[classifierName];
        appState.selectedClassifier = classifierName;
        appState.parameters = {};

        Object.entries(parameters).forEach(([param, defaultValue]) => {
            appState.parameters[param] = defaultValue;
        });

        populateParameterForm(parameters);
        const parameterSection = document.getElementById("parameterSection");
        parameterSection.style.display = "block";

        // Add scroll to show the newly displayed section
        scrollToElement(parameterSection);
    } catch (error) {
        console.error("Error fetching classifier parameters:", error);
    } finally {
        loadingState.setLoading(false);
    }
};

// Start training the model.
window.startTraining = async () => {
    // Prevent multiple concurrent requests
    if (loadingState.isLoading) return;

    loadingState.setLoading(true);

    try {
        resetUIstartTraining();
        showTrainingLoading();

        const trainingData = buildTrainingData(appState);
        const response = await trainModel(trainingData);

        appState.featureDescriptor = response.descriptor;
        updateUIAfterTraining(response);

        createFeatureInputs(response.descriptor);
        // Populate surrogate parameters form if container exists.
        const featureButtonContainer = document.getElementById(
            "featureButtonContainer"
        );
        const surrogateContainer =
            document.getElementById("surrogateContainer");
        if (surrogateContainer) {
            populateSurrogateForm(surrogateContainer);
        }

        // Add scroll to show the newly displayed feature inputs
        if (featureButtonContainer) {
            scrollToElement(featureButtonContainer);
        }
    } catch (error) {
        console.error("Training failed:", error);
    } finally {
        loadingState.setLoading(false);
    }
};

// Updated explainInstance function to handle custom data workflow
window.explainInstance = async () => {
    // Prevent multiple concurrent requests
    if (loadingState.isLoading) return;

    // Validate that at least one visualization is selected
    const vizSettings = getVisualizationSettings();
    const hasSelectedViz = Object.values(vizSettings).some(selected => selected);
    
    if (!hasSelectedViz) {
        alert("Please select at least one visualization to display.");
        return;
    }

    loadingState.setLoading(true);

    try {
        showExplanationLoading();
        
        let instanceData = getFeatureValues();
        
        const surrogateParams = getSurrogateParameters();
        const requestData = buildExplanationRequestData(
            instanceData,
            surrogateParams,
            appState
        );
        
        const result = await fetchExplanation(requestData);

        // Get the current scatter plot method
        const methodElement = document.querySelector(
            'input[name="scatterPlotMethod"]:checked'
        );
        const currentMethod = methodElement ? methodElement.value : 'umap';

        // Now fetch the colors based on the neighborhood data and current method
        await initializeColors(currentMethod);
        setGlobalColorMap(result.uniqueClasses);

        // Make main container visible
        const svgContainer = document.getElementById("svg-container");
        if (svgContainer) {
            svgContainer.style.display = "block";
            svgContainer.style.visibility = "visible";
            svgContainer.style.opacity = "1";
        }

        // Make visualization containers visible based on settings
        const scatterPlot = document.getElementById("scatter-plot");
        const treePlot = document.getElementById("classic-tree-plot");
        const blocksTreeContainer = document.getElementById("blocks-tree-plot");
        const treeSpawnContainer = document.getElementById("treespawn-tree-plot");
        
        if (scatterPlot && vizSettings.scatterPlot) {
            scatterPlot.style.display = "block";
            scatterPlot.style.visibility = "visible";
        }
        
        if (blocksTreeContainer && vizSettings.blocksTree) {
            blocksTreeContainer.style.display = "block";
            blocksTreeContainer.style.visibility = "visible";
        }

        if (treePlot && vizSettings.classicTree) {
            treePlot.style.display = "block";
            treePlot.style.visibility = "visible";
        }

        if (treeSpawnContainer && vizSettings.treeSpawn) {
            treeSpawnContainer.style.display = "block";
            treeSpawnContainer.style.visibility = "visible";
        }

        updateVisualizationUI();

        // **CRITICAL CHANGES FOR ENCODED FEATURES**
        // Get the encoded instance from the backend response
        const encodedInstance = result.encodedInstance;
        
        // Store both original and encoded instances
        // Original for display/reference, encoded for tree path tracing
        setExplainedInstance(
            encodedInstance || instanceData,  // Use encoded for tree operations
            instanceData,  // Store original as reference
            result.featureMappingInfo,
        );

        // Store encoded instance globally for debugging/reference
        window.currentFeatureMappingInfo = result.featureMappingInfo;
        window.currentOriginalInstance = instanceData;
        window.currentEncodedInstance = encodedInstance;

        // Initialize visualizations with proper data structure
        initializeVisualizations({
            decisionTreeVisualizationData: result.decisionTreeVisualizationData,
            scatterPlotVisualizationData: result.scatterPlotVisualizationData,
            encodedInstance: encodedInstance,  // Pass encoded instance
            originalInstance: instanceData,    // Also pass original for reference
            featureMappingInfo: result.featureMappingInfo  // Include feature mapping info
        });

        if (svgContainer) {
            scrollToElement(svgContainer);
        }
    } catch (error) {
        console.error("Failed to explain instance:", error);
        
        // Enhanced error logging for debugging
        if (error.response) {
            console.error("Response error:", error.response);
        }
        if (error.request) {
            console.error("Request error:", error.request);
        }
    } finally {
        loadingState.setLoading(false);
    }
};

/********************************************
 *      DATASET PANEL HANDLING
 ********************************************/
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;
window.appState = appState;
window.getSurrogateParameters = getSurrogateParameters;
window.getVisualizationSettings = getVisualizationSettings;
window.showExplanationLoading = showExplanationLoading;
window.updateVisualizationUI = updateVisualizationUI;
window.buildExplanationRequestData = buildExplanationRequestData;

// Initialize UI and attach event listeners when DOM is loaded.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check if custom data is loaded first
        const customDataCheck = await checkCustomData();
        
        if (customDataCheck.custom_data_loaded) {
            // Update app state with custom data info
            appState.dataset_name = customDataCheck.dataset_name;
            appState.featureDescriptor = customDataCheck.descriptor;
            
            // CRITICAL FIX: Set the state in ui.js so getFeatureValues() works correctly
            setState(appState);
            
            // Hide the first three sections
            const datasetSection = document.getElementById("datasetSection");
            const classifierSection = document.getElementById("classifierSection"); 
            const parameterSection = document.getElementById("parameterSection");
            
            if (datasetSection) datasetSection.style.display = "none";
            if (classifierSection) classifierSection.style.display = "none";
            if (parameterSection) parameterSection.style.display = "none";
            
            // Show feature inputs directly
            createFeatureInputs(customDataCheck.descriptor);
            const featureButtonContainer = document.getElementById("featureButtonContainer");
            if (featureButtonContainer) {
                featureButtonContainer.style.display = "block";
                
                // Populate surrogate parameters form
                const surrogateContainer = document.getElementById("surrogateContainer");
                if (surrogateContainer) {
                    populateSurrogateForm(surrogateContainer);
                }
                
                scrollToElement(featureButtonContainer);
            }
            
        } else {
            // No custom data - show normal flow
            setState(appState);
            const datasets = await fetchDatasets();
            populateDatasetGrid(datasets);
            attachDatasetPanelEventListeners();
        }
        
    } catch (error) {
        console.error("Failed to initialize:", error);
        // Fallback to normal flow
        setState(appState);
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
        attachDatasetPanelEventListeners();
    }
});
