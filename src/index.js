// index.js
import {
    fetchTreeData,
} from './jsHelpers/DecisionTree.js';
import {
    initializeScatterPlot,
} from './jsHelpers/PCA.js';
import {
    toggleDataset,
} from './jsHelpers/datasetShow.js';
window.toggleDataset = toggleDataset;

// State management
let currentState = {
    selectedDataset: null,
    selectedClassifier: null,
    parameters: {}
};

// Initialize the application
window.onload = async function() {
    try {
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
    } catch (error) {
        console.error("Failed to load datasets:", error);
    }
};

// Fetch available datasets
async function fetchDatasets() {
    const response = await fetch("http://127.0.0.1:8000/api/get-datasets");
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Populate dataset grid
function populateDatasetGrid(data) {
    const grid = document.getElementById("datasetGrid");
    grid.innerHTML = "";
    
    data.datasets.forEach(dataset => {
        const card = document.createElement("div");
        card.className = "dataset-card";
        card.innerHTML = `
            <h3>${dataset}</h3>
            <button onclick="selectDataset('${dataset}')">Select</button>
        `;
        grid.appendChild(card);
    });
}

// Handle dataset selection
window.selectDataset = async function (datasetName) {
    currentState.selectedDataset = datasetName;
    
    // Fetch and display dataset info
    const info = await fetch(`http://127.0.0.1:8000/api/get-dataset-info/${datasetName}`);
    const datasetInfo = await info.json();
    
    document.getElementById("datasetInfo").innerHTML = `
        <h3>Dataset: ${datasetName}</h3>
        <p>Samples: ${datasetInfo.n_samples}</p>
        <p>Features: ${datasetInfo.n_features}</p>
    `;

    // Show classifier selection
    const classifiers = await fetchClassifiers();
    populateClassifierGrid(classifiers);
    document.getElementById("classifierSection").style.display = "block";
}

// Fetch available classifiers
async function fetchClassifiers() {
    const response = await fetch("http://127.0.0.1:8000/api/get-classifiers");
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Populate classifier grid
function populateClassifierGrid(data) {
    const grid = document.getElementById("classifierGrid");
    grid.innerHTML = "";
    
    Object.keys(data.classifiers).forEach(classifier => {
        const card = document.createElement("div");
        card.className = "classifier-card";
        card.innerHTML = `
            <h3>${classifier}</h3>
            <button onclick="selectClassifier('${classifier}')">Select</button>
        `;
        grid.appendChild(card);
    });
}

// Modify the selectClassifier function to initialize parameters
window.selectClassifier = async function (classifierName) {
    currentState.selectedClassifier = classifierName;
    currentState.parameters = {}; // Reset parameters
    
    // Fetch classifier parameters and show parameter form
    const response = await fetch("http://127.0.0.1:8000/api/get-classifiers");
    const data = await response.json();
    const parameters = data.classifiers[classifierName];

    // Initialize parameters with default values
    Object.entries(parameters).forEach(([param, defaultValue]) => {
        currentState.parameters[param] = defaultValue;
    });
    
    populateParameterForm(parameters);
    document.getElementById("parameterSection").style.display = "block";
}

// Populate parameter form
function populateParameterForm(parameters) {
    const form = document.getElementById("parameterForm");
    form.innerHTML = "";
    
    Object.entries(parameters).forEach(([param, defaultValue]) => {
        const input = document.createElement("div");
        input.className = "parameter-input";
        input.innerHTML = `
            <label for="${param}">${param}:</label>
            <input type="text" id="${param}" value="${defaultValue}" 
                   onchange="updateParameter('${param}', this.value)">
        `;
        form.appendChild(input);
    });
}

// Update parameter value
window.updateParameter = function (param, value) {
    currentState.parameters[param] = value;
}


// Start model training
window.startTraining = async function () {
    const trainingData = {
        dataset: currentState.selectedDataset,
        classifier: currentState.selectedClassifier,
        parameters: currentState.parameters
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
        
        console.log(result);
    } catch (error) {
        console.error("Training failed:", error);
    }
}

async function fetchFeatures() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8000/api/get-df-features"
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching features:", error);
        throw error;
    }
}

function populateFeatureCarousel(features) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = "";
    features.forEach((feature) => {
        const box = document.createElement("div");
        box.className = "feature-box";
        box.innerHTML = `
            <div>${feature}</div>
            <input type="text" id="${feature}" placeholder="Enter value">
        `;
        carousel.appendChild(box);
    });
}

// Function to initialize both visualizations
async function initializeVisualizations() {
    try {
        const [treeData, scatterData] = await Promise.all([
            fetchTreeData(),
            initializeScatterPlot("#pca-plot")
        ]);

        return { treeData, scatterData };
    } catch (error) {
        console.error("Error initializing visualizations:", error);
    }
}

document.addEventListener("DOMContentLoaded", initializeVisualizations);
