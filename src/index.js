import { 
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    createFeatureInputs,
    getFeatureValues,
    resetFeatures,
    initializeUI
} from './jsHelpers/ui.js';

import {
    initializeVisualizations
} from './jsHelpers/visualizations.js';

import {
    updateParameter
} from './jsHelpers/stateManagement.js';

// State management
export const appState = {
    selectedDataset: null,
    selectedClassifier: null,
    parameters: {},
    featureDescriptor: null
};

// Initialize the application
window.onload = async function() {
    try {
        initializeUI(appState); // Pass state to UI module
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
    } catch (error) {
        console.error("Failed to load datasets:", error);
    }
};

// API calls
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

// Handle dataset selection
window.selectDataset = async function (datasetName) {
    appState.selectedDataset = datasetName;
    
    const info = await fetch(`http://127.0.0.1:8000/api/get-dataset-info/${datasetName}`);
    const datasetInfo = await info.json();
    
    document.getElementById("datasetInfo").innerHTML = `
        <h3>Dataset: ${datasetName}</h3>
        <p>Samples: ${datasetInfo.n_samples}</p>
        <p>Features: ${datasetInfo.feature_names}</p>
        <p>Target: ${datasetInfo.target_names}</p>
    `;

    const classifiers = await fetchClassifiers();
    populateClassifierGrid(classifiers);
    document.getElementById("classifierSection").style.display = "block";
}

window.selectClassifier = async function (classifierName) {
    appState.selectedClassifier = classifierName;
    appState.parameters = {};
    
    const response = await fetch("http://127.0.0.1:8000/api/get-classifiers");
    const data = await response.json();
    const parameters = data.classifiers[classifierName];

    Object.entries(parameters).forEach(([param, defaultValue]) => {
        appState.parameters[param] = defaultValue;
    });
    
    populateParameterForm(parameters);
    document.getElementById("parameterSection").style.display = "block";
}

window.startTraining = async function () {
    const trainingData = {
        dataset: appState.selectedDataset,
        classifier: appState.selectedClassifier,
        parameters: appState.parameters
    };

    try {
        const response = await fetch('http://127.0.0.1:8000/api/train-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trainingData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        appState.featureDescriptor = result.descriptor;  // Store descriptor in state
        createFeatureInputs(result.descriptor);
        document.getElementById("featureButtonContainer").style.display = "block";
        
    } catch (error) {
        console.error("Training failed:", error);
    }
}

// Expose necessary functions to window
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;

document.addEventListener("DOMContentLoaded", initializeVisualizations);