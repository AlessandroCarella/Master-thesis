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
import { updateParameter } from "./jsHelpers/stateManagement.js";
import { setGlobalColorMap } from "./jsHelpers/visualizationConnector.js";

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
    determineDatasetType,
    buildExplanationRequestData,
    updateVisualizationUI,
} from "./jsHelpers/UIHelpers/explanation.js";

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
        document.getElementById("classifierSection").style.display = "block";

        // Re-attach event listeners if needed.
        attachDatasetPanelEventListeners();
    } catch (error) {
        handleDatasetInfoError(datasetName, error);
    }
};

// Handle classifier selection.
window.selectClassifier = async (classifierName) => {
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
        document.getElementById("parameterSection").style.display = "block";
    } catch (error) {
        console.error("Error fetching classifier parameters:", error);
    }
};

// Start training the model.
window.startTraining = async () => {
    try {
        resetUIstartTraining();
        showTrainingLoading();

        const trainingData = buildTrainingData(appState);
        const response = await trainModel(trainingData);

        appState.featureDescriptor = response.descriptor;
        updateUIAfterTraining(response);

        createFeatureInputs(response.descriptor, response.datasetType);
        // Populate surrogate parameters form if container exists.
        const surrogateContainer =
            document.getElementById("surrogateContainer");
        if (surrogateContainer) {
            populateSurrogateForm(surrogateContainer);
        }
    } catch (error) {
        console.error("Training failed:", error);
    }
};

// Explain an instance based on feature values.
window.explainInstance = async () => {
    try {
        showExplanationLoading();
        const instanceData = getFeatureValues();
        const surrogateParams = getSurrogateParameters();
        const datasetType = determineDatasetType(appState);
        const requestData = buildExplanationRequestData(
            instanceData,
            surrogateParams,
            datasetType,
            appState
        );

        const result = await fetchExplanation(requestData);

        setGlobalColorMap(result.uniqueClasses);
        updateVisualizationUI();

        initializeVisualizations(
            {
                decisionTreeVisualizationData:
                    result.decisionTreeVisualizationData,
                PCAvisualizationData: result.PCAvisualizationData,
            },
            datasetType
        );
    } catch (error) {
        console.error("Failed to explain instance:", error);
    }
};

/********************************************
 *      DATASET PANEL HANDLING
 ********************************************/
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;

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
