/********************************************
 *               IMPORTS
 ********************************************/
import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
    getSurrogateParameters,
    createFeatureInputs,
    getFeatureValues,
    resetFeatures,
    initializeUI,
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
    updateVisualizationUI,
} from "./jsHelpers/UIHelpers/explanation.js";

import { scrollToElement } from "./jsHelpers/scroll.js";
import { initializeColors, setGlobalColorMap } from "./jsHelpers/visualizationConnectorHelpers/colors.js";

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

// Explain an instance based on feature values.
window.explainInstance = async () => {
    // Prevent multiple concurrent requests
    if (loadingState.isLoading) return;

    loadingState.setLoading(true);

    try {
        showExplanationLoading();
        const instanceData = getFeatureValues();
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

        
        // Also make sure scatter plot and tree plot containers are visible
        const scatterPlot = document.getElementById("scatter-plot");
        const treePlot = document.getElementById("tree-plot");
        const blocksTreeContainer = document.getElementById("blocks-tree-plot");
        
        if (scatterPlot) {
            scatterPlot.style.display = "block";
            scatterPlot.style.visibility = "visible";
        }
        
        if (treePlot) {
            treePlot.style.display = "block";
            treePlot.style.visibility = "visible";
        }

        if (blocksTreeContainer) {
            blocksTreeContainer.style.display = "block";
            blocksTreeContainer.style.visibility = "visible";
        }

        updateVisualizationUI();

        setExplainedInstance(instanceData);

        initializeVisualizations({
            decisionTreeVisualizationData: result.decisionTreeVisualizationData,
            scatterPlotVisualizationData: result.scatterPlotVisualizationData,
            instance: instanceData
        });

        scrollToElement(svgContainer);
    } catch (error) {
        console.error("Failed to explain instance:", error);
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
window.showExplanationLoading = showExplanationLoading;
window.updateVisualizationUI = updateVisualizationUI;
window.buildExplanationRequestData = buildExplanationRequestData;

// Initialize UI and attach event listeners when DOM is loaded.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        initializeUI(appState);
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
        attachDatasetPanelEventListeners();
    } catch (error) {
        console.error("Failed to load datasets:", error);
    }
});
