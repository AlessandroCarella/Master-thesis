/********************************************
 *               IMPORTS
 ********************************************/
import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    createFeatureInputs,
    getFeatureValues,
    resetFeatures,
    initializeUI,
} from "./jsHelpers/UI.js";

import { initializeVisualizations } from "./jsHelpers/visualizations.js";
import { updateParameter } from "./jsHelpers/stateManagement.js";
import { setGlobalColorMap } from "./jsHelpers/visualizationConnector.js";

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
 *              UI RESET
 ********************************************/
function resetUIDatasetSelection() {
    // Hide classifier section
    document.getElementById("classifierSection").style.display = "none";

    // Hide and reset parameter section
    document.getElementById("parameterSection").style.display = "none";
    document.getElementById("parameterForm").innerHTML = "";

    // Hide and reset feature inputs
    document.getElementById("featureButtonContainer").style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Hide visualization container
    document.querySelector(".svg-container").style.display = "none";

    // Reset visualization elements
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset state
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;

    // Reset the global color map
    setGlobalColorMap(null);
}

function resetUISelectClassifier() {
    // // Hide and reset parameter section
    // document.getElementById("parameterSection").style.display = "none";
    // document.getElementById("parameterForm").innerHTML = "";

    // Hide and reset feature inputs
    document.getElementById("featureButtonContainer").style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Hide visualization container
    document.querySelector(".svg-container").style.display = "none";

    // Reset visualization elements
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset state
    appState.featureDescriptor = null;
}

function resetUIstartTraining() {
    // Hide visualization container
    document.querySelector(".svg-container").style.display = "none";

    // Reset visualization elements
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";
}

/********************************************
 *              API CALLS
 ********************************************/
async function fetchDatasets() {
    const response = await fetch("http://127.0.0.1:8000/api/get-datasets");
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function fetchClassifiers() {
    const response = await fetch("http://127.0.0.1:8000/api/get-classifiers");
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

/********************************************
 *          EVENT HANDLERS
 ********************************************/
// Handle dataset selection
window.selectDataset = async function (datasetName) {
    // Reset UI first
    resetUIDatasetSelection();

    // Update state with new dataset
    appState.dataset_name = datasetName;

    try {
        const infoResponse = await fetch(
            `http://127.0.0.1:8000/api/get-dataset-info/${datasetName}`
        );
        const datasetInfo = await infoResponse.json();

        // Initialize color map with target classes
        if (datasetInfo.target_names && datasetInfo.target_names.length > 0) {
            setGlobalColorMap(datasetInfo.target_names);
        }

        document.getElementById("datasetInfo").innerHTML = `
            <h3>Dataset: ${datasetName}</h3>
            <p>Samples: ${datasetInfo.n_samples}</p>
            <p>Features: ${datasetInfo.feature_names}</p>
            <p>Target: ${datasetInfo.target_names}</p>
        `;

        const classifiers = await fetchClassifiers();
        populateClassifierGrid(classifiers);
        document.getElementById("classifierSection").style.display = "block";
    } catch (error) {
        console.error("Error fetching dataset info:", error);
    }
};

// Handle classifier selection
window.selectClassifier = async function (classifierName) {
    resetUISelectClassifier();
    appState.selectedClassifier = classifierName;
    appState.parameters = {};

    try {
        const response = await fetch(
            "http://127.0.0.1:8000/api/get-classifiers"
        );
        const data = await response.json();
        const parameters = data.classifiers[classifierName];

        // Initialize state parameters with default values
        Object.entries(parameters).forEach(([param, defaultValue]) => {
            appState.parameters[param] = defaultValue;
        });

        populateParameterForm(parameters);
        document.getElementById("parameterSection").style.display = "block";
    } catch (error) {
        console.error("Error fetching classifier parameters:", error);
    }
};

// Start training the model
window.startTraining = async function () {
    resetUIstartTraining();

    const trainingData = {
        dataset_name: appState.dataset_name,
        classifier: appState.selectedClassifier,
        parameters: appState.parameters,
    };

    try {
        const response = await fetch("http://127.0.0.1:8000/api/train-model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trainingData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        appState.featureDescriptor = result.descriptor;
        createFeatureInputs(result.descriptor);
        document.getElementById("featureButtonContainer").style.display =
            "block";
    } catch (error) {
        console.error("Training failed:", error);
    }
};

// Explain an instance based on feature values
window.explainInstance = async function () {
    const instanceData = getFeatureValues();
    const datasetName = appState.dataset_name;

    const requestData = {
        instance: instanceData,
        dataset_name: datasetName,
        neighbourhood_size: 100,
        PCAstep: 0.1,
    };

    try {
        const response = await fetch("http://127.0.0.1:8000/api/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        // Show the visualization container
        document.querySelector(".svg-container").style.display = "block";

        // Initialize visualizations with the new data
        initializeVisualizations({
            decisionTreeVisualizationData: result.decisionTreeVisualizationData,
            PCAvisualizationData: result.PCAvisualizationData,
        });
    } catch (error) {
        console.error("Failed to explain instance:", error);
    }
};

/********************************************
 *     EXPOSED FUNCTIONS & INITIALIZATION
 ********************************************/
// Expose additional functions to the global scope
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;

// Initialize the UI and load datasets on window load
window.onload = async function () {
    try {
        initializeUI(appState); // Initialize UI with current state
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
    } catch (error) {
        console.error("Failed to load datasets:", error);
    }
};
