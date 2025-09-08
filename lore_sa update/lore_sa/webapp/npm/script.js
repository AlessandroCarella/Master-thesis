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
} from "./jsHelpers/visualizationConnector.js";

// Import helper functions
import {
    fetchDatasets,
    fetchClassifiers,
    fetchDatasetInfo,
    fetchClassifierParameters,
    trainModel,
    fetchExplanation,
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
    buildProvidedInstanceRequestData,
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
    instanceProvided: false,
    providedInstance: null,
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
    
    // Enhanced reset: clear app state more thoroughly
    resetUIDatasetSelection(appState);
    
    // Reset dataset-specific state
    appState.dataset_name = datasetName;
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;
    appState.instanceProvided = false;
    appState.providedInstance = null;

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

// Helper function to build unified request data
function buildUnifiedExplanationRequestData(instanceData, surrogateParams, appState) {
    const baseRequest = {
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: surrogateParams.scatterPlotMethod,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
        keepDuplicates: surrogateParams.keepDuplicates,
    };

    // If instanceData is provided, include it in the request
    // If not, the backend will use the provided instance from webapp state
    if (instanceData !== null && instanceData !== undefined) {
        baseRequest.instance = instanceData;
    }

    return baseRequest;
}

// Updated explainInstance function to use unified endpoint
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
        
        const surrogateParams = getSurrogateParameters();
        let requestData;
        
        // Build unified request data
        if (appState.instanceProvided && appState.providedInstance) {
            // For provided instance case, don't include instance in request
            // Backend will automatically use webapp_state.provided_instance
            requestData = buildUnifiedExplanationRequestData(null, surrogateParams, appState);
        } else {
            // For regular case, include instance from feature inputs
            let instanceData = getFeatureValues();
            requestData = buildUnifiedExplanationRequestData(instanceData, surrogateParams, appState);
        }
        
        // Use single unified endpoint
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
        
        // For provided instance case, use the provided instance as original instance
        const originalInstance = appState.instanceProvided ? appState.providedInstance : getFeatureValues();
        
        // Store both original and encoded instances
        setExplainedInstance(
            encodedInstance || originalInstance,  // Use encoded for tree operations
            originalInstance,  // Store original as reference
            result.featureMappingInfo,
        );

        // Store encoded instance globally for debugging/reference
        window.currentFeatureMappingInfo = result.featureMappingInfo;
        window.currentOriginalInstance = originalInstance;
        window.currentEncodedInstance = encodedInstance;

        // Initialize visualizations with proper data structure
        initializeVisualizations({
            decisionTreeVisualizationData: result.decisionTreeVisualizationData,
            scatterPlotVisualizationData: result.scatterPlotVisualizationData,
            encodedInstance: encodedInstance,  // Pass encoded instance
            originalInstance: originalInstance,    // Also pass original for reference
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
            appState.instanceProvided = customDataCheck.instance_provided || false;
            appState.providedInstance = customDataCheck.provided_instance || null;
            
            // CRITICAL FIX: Set the state in ui.js so getFeatureValues() works correctly
            setState(appState);
            
            // Hide the first three sections
            const datasetSection = document.getElementById("datasetSection");
            const classifierSection = document.getElementById("classifierSection"); 
            const parameterSection = document.getElementById("parameterSection");
            
            if (datasetSection) datasetSection.style.display = "none";
            if (classifierSection) classifierSection.style.display = "none";
            if (parameterSection) parameterSection.style.display = "none";
            
            // Check if instance was provided
            if (appState.instanceProvided) {
                // Instance provided - skip feature inputs, show only surrogate parameters
                const featureButtonContainer = document.getElementById("featureButtonContainer");
                if (featureButtonContainer) {
                    // Clear and setup container for surrogate params only
                    featureButtonContainer.innerHTML = `
                        <div class="provided-instance-info">
                            <h3>Instance Provided</h3>
                            <p>An instance has been pre-provided for explanation. Configure the surrogate model parameters below and click "Explain!" to generate the explanation.</p>
                        </div>
                        <div id="surrogateContainer"></div>
                        <div class="button-group">
                            <button class="submit-btn btn" onclick="explainInstance()">Explain!</button>
                        </div>
                    `;
                    featureButtonContainer.style.display = "block";
                    
                    // Populate surrogate parameters form
                    const surrogateContainer = document.getElementById("surrogateContainer");
                    if (surrogateContainer) {
                        populateSurrogateForm(surrogateContainer);
                    }
                    
                    scrollToElement(featureButtonContainer);
                }
            } else {
                // No instance provided - show feature inputs normally
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
