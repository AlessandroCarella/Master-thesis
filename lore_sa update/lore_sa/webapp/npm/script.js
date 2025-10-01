/**
 * @fileoverview Main application entry point for machine learning model explanation interface.
 * Handles dataset selection, classifier configuration, model training, and explanation generation.
 * @author Generated documentation
 * @module MainApp
 */

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
    getAllDimensionalityReductionParameters, // Import new function
} from "./jsHelpers/ui.js";

import { initializeVisualizations } from "./jsHelpers/visualizations.js";
import { updateParameter, loadingState } from "./jsHelpers/stateManagement.js";
import {
    setExplainedInstance,
} from "./jsHelpers/visualizationConnector.js";

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

/**
 * @typedef {Object} AppState
 * @property {string|null} dataset_name - Currently selected dataset name
 * @property {string|null} selectedClassifier - Currently selected classifier type
 * @property {Object} parameters - Classifier parameters configuration
 * @property {Object|null} featureDescriptor - Dataset feature information
 * @property {boolean} instanceProvided - Whether an instance was pre-provided
 * @property {Object|null} providedInstance - Pre-provided instance data
 * @property {Object} dimensionalityReductionParameters - All dimensionality reduction method parameters
 */

/**
 * Global application state object
 * @type {AppState}
 */
export const appState = {
    dataset_name: null,
    selectedClassifier: null,
    parameters: {},
    featureDescriptor: null,
    instanceProvided: false,
    providedInstance: null,
    // Store parameters for all dimensionality reduction methods
    dimensionalityReductionParameters: {
        "UMAP": {},
        "PCA": {},
        "t-SNE": {},
        "MDS": {}
    }
};

/**
 * Handles dataset selection and initializes classifier selection interface.
 * Manages loading states and error handling for dataset operations.
 * 
 * @async
 * @param {string} datasetName - Name of the dataset to select
 * @throws {Error} When dataset information cannot be fetched
 * @example
 * await selectDataset('iris');
 * // Loads iris dataset and shows classifier selection
 * 
 * @see fetchDatasetInfo
 * @see populateClassifierGrid
 */
window.selectDataset = async function (datasetName) {
    if (loadingState.isLoading) return;

    loadingState.setLoading(true);

    closeDatasetPanelIfVisible();
    
    resetUIDatasetSelection(appState);
    
    appState.dataset_name = datasetName;
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;
    appState.instanceProvided = false;
    appState.providedInstance = null;
    // Reset Dimensionality Reduction techniques Parameters
    appState.dimensionalityReductionParameters = {
        "UMAP": {},
        "PCA": {},
        "t-SNE": {},
        "MDS": {}
    };

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

        scrollToElement(classifierSection);

        attachDatasetPanelEventListeners();
    } catch (error) {
        handleDatasetInfoError(datasetName, error);
    } finally {
        loadingState.setLoading(false);
    }
};

/**
 * Handles classifier selection and displays parameter configuration interface.
 * Fetches classifier-specific parameters and initializes form.
 * 
 * @async
 * @param {string} classifierName - Name of the classifier to select
 * @throws {Error} When classifier parameters cannot be fetched
 * @example
 * await selectClassifier('RandomForest');
 * // Shows parameter configuration for Random Forest
 * 
 * @see fetchClassifierParameters
 * @see populateParameterForm
 */
window.selectClassifier = async (classifierName) => {
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

        scrollToElement(parameterSection);
    } catch (error) {
        console.error("Error fetching classifier parameters:", error);
    } finally {
        loadingState.setLoading(false);
    }
};

/**
 * Initiates model training with current configuration and displays feature input interface.
 * Updates application state with training results and feature descriptors.
 * 
 * @async
 * @throws {Error} When model training fails
 * @example
 * await startTraining();
 * // Trains model and shows feature input form
 * 
 * @see buildTrainingData
 * @see trainModel
 * @see createFeatureInputs
 */
window.startTraining = async () => {
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
        
        const featureButtonContainer = document.getElementById("featureButtonContainer");
        const surrogateContainer = document.getElementById("surrogateContainer");
        
        if (surrogateContainer) {
            populateSurrogateForm(surrogateContainer);
        }

        if (featureButtonContainer) {
            scrollToElement(featureButtonContainer);
        }
    } catch (error) {
        console.error("Training failed:", error);
    } finally {
        loadingState.setLoading(false);
    }
};

/**
 * Updates Dimensionality Reduction techniques Parameters
 in app state
 * @description Collects current UI values and stores them in app state
 * @returns {void}
 * @example
 * updateDimensionalityReductionParameters();
 * // Updates appState.dimensionalityReductionParameters with current UI values
 */
function updateDimensionalityReductionParameters() {
    try {
        const allParams = getAllDimensionalityReductionParameters();
        appState.dimensionalityReductionParameters = { ...appState.dimensionalityReductionParameters, ...allParams };
    } catch (error) {
        console.warn("Could not update Dimensionality Reduction techniques Parameters:", error);
    }
}

/**
 * Builds unified request data for explanation endpoint.
 * Combines instance data with surrogate parameters for API call.
 * 
 * @param {Object|null} instanceData - Instance data to explain (null for provided instances)
 * @param {Object} surrogateParams - Surrogate model parameters
 * @param {AppState} appState - Current application state
 * @returns {Object} Complete request data object
 * @example
 * const requestData = buildUnifiedExplanationRequestData(
 *   { feature1: 1.0, feature2: 0.5 },
 *   { neighbourhood_size: 100 },
 *   appState
 * );
 */
function buildUnifiedExplanationRequestData(instanceData, surrogateParams, appState) {
    // Update stored parameters with current UI values
    updateDimensionalityReductionParameters();
    
    const methodElement = document.querySelector(
        'input[name="scatterPlotMethod"]:checked'
    );
    const scatterPlotMethod = methodElement ? methodElement.value : "umap";
    
    const baseRequest = {
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: scatterPlotMethod,
        dimensionalityReductionMethod: scatterPlotMethod,
        dimensionalityReductionParameters: appState.dimensionalityReductionParameters[scatterPlotMethod.toUpperCase()] || {},
        allMethodParameters: appState.dimensionalityReductionParameters,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
        keepDuplicates: surrogateParams.keepDuplicates,
    };

    if (instanceData !== null && instanceData !== undefined) {
        baseRequest.instance = instanceData;
    }

    return baseRequest;
}

/**
 * Generates explanation for the current instance using selected visualizations.
 * Validates visualization selection, processes instance data, and initializes visualizations.
 * 
 * @async
 * @throws {Error} When explanation generation fails
 * @example
 * await explainInstance();
 * // Generates and displays explanation visualizations
 * 
 * @see getVisualizationSettings
 * @see getSurrogateParameters
 * @see fetchExplanation
 * @see initializeVisualizations
 */
window.explainInstance = async () => {
    if (loadingState.isLoading) return;

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
        
        if (appState.instanceProvided && appState.providedInstance) {
            requestData = buildUnifiedExplanationRequestData(null, surrogateParams, appState);
        } else {
            let instanceData = getFeatureValues();
            requestData = buildUnifiedExplanationRequestData(instanceData, surrogateParams, appState);
        }
        
        const result = await fetchExplanation(requestData);

        const methodElement = document.querySelector('input[name="scatterPlotMethod"]:checked');
        const currentMethod = methodElement ? methodElement.value : 'umap';

        await initializeColors(currentMethod);
        setGlobalColorMap(result.uniqueClasses);

        const svgContainer = document.getElementById("svg-container");
        if (svgContainer) {
            svgContainer.style.display = "block";
            svgContainer.style.visibility = "visible";
            svgContainer.style.opacity = "1";
        }

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

        const encodedInstance = result.encodedInstance;
        const originalInstance = appState.instanceProvided ? appState.providedInstance : getFeatureValues();
        
        setExplainedInstance(
            encodedInstance || originalInstance,
            originalInstance,
            result.featureMappingInfo,
        );

        window.currentFeatureMappingInfo = result.featureMappingInfo;
        window.currentOriginalInstance = originalInstance;
        window.currentEncodedInstance = encodedInstance;

        initializeVisualizations({
            decisionTreeVisualizationData: result.decisionTreeVisualizationData,
            scatterPlotVisualizationData: result.scatterPlotVisualizationData,
            encodedInstance: encodedInstance,
            originalInstance: originalInstance,
            featureMappingInfo: result.featureMappingInfo
        });

        if (svgContainer) {
            scrollToElement(svgContainer);
        }
    } catch (error) {
        console.error("Failed to explain instance:", error);
        
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

// Export functions to global window object for HTML event handlers
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;
window.appState = appState;
window.getSurrogateParameters = getSurrogateParameters;
window.getVisualizationSettings = getVisualizationSettings;
window.showExplanationLoading = showExplanationLoading;
window.updateVisualizationUI = updateVisualizationUI;
window.buildExplanationRequestData = buildExplanationRequestData;
window.getAllDimensionalityReductionParameters = getAllDimensionalityReductionParameters;
window.updateDimensionalityReductionParameters = updateDimensionalityReductionParameters;

/**
 * Initializes application when DOM is loaded.
 * Checks for custom data and configures interface accordingly.
 * 
 * @async
 * @listens DOMContentLoaded
 * @throws {Error} When initialization fails
 * @example
 * // Automatically called when DOM loads
 * // Sets up dataset grid or custom data interface
 */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const customDataCheck = await checkCustomData();
        
        if (customDataCheck.custom_data_loaded) {
            appState.dataset_name = customDataCheck.dataset_name;
            appState.featureDescriptor = customDataCheck.descriptor;
            appState.instanceProvided = customDataCheck.instance_provided || false;
            appState.providedInstance = customDataCheck.provided_instance || null;
            
            setState(appState);
            
            const datasetSection = document.getElementById("datasetSection");
            const classifierSection = document.getElementById("classifierSection"); 
            const parameterSection = document.getElementById("parameterSection");
            
            if (datasetSection) datasetSection.style.display = "none";
            if (classifierSection) classifierSection.style.display = "none";
            if (parameterSection) parameterSection.style.display = "none";
            
            if (appState.instanceProvided) {
                const featureButtonContainer = document.getElementById("featureButtonContainer");
                if (featureButtonContainer) {
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
                    
                    const surrogateContainer = document.getElementById("surrogateContainer");
                    if (surrogateContainer) {
                        populateSurrogateForm(surrogateContainer);
                    }
                    
                    scrollToElement(featureButtonContainer);
                }
            } else {
                createFeatureInputs(customDataCheck.descriptor);
                const featureButtonContainer = document.getElementById("featureButtonContainer");
                if (featureButtonContainer) {
                    featureButtonContainer.style.display = "block";
                    
                    const surrogateContainer = document.getElementById("surrogateContainer");
                    if (surrogateContainer) {
                        populateSurrogateForm(surrogateContainer);
                    }
                    
                    scrollToElement(featureButtonContainer);
                }
            }
            
        } else {
            setState(appState);
            const datasets = await fetchDatasets();
            populateDatasetGrid(datasets);
            attachDatasetPanelEventListeners();
        }
        
    } catch (error) {
        console.error("Failed to initialize:", error);
        setState(appState);
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
        attachDatasetPanelEventListeners();
    }
});
