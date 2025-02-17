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

let featureDescriptor = null;

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
        featureDescriptor = result.descriptor;
        createFeatureInputs(featureDescriptor);
        
        // Show the feature input section
        document.getElementById("featureButtonContainer").style.display = "block";
        
    } catch (error) {
        console.error("Training failed:", error);
    }
}

function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = ""; // Clear existing inputs

    // Create section headers
    const sections = {
        numeric: createSection('Numeric Features', 'numeric-features'),
        categorical: createSection('Categorical Features', 'categorical-features'),
        ordinal: createSection('Ordinal Features', 'ordinal-features')
    };

    // Add sections to carousel
    Object.values(sections).forEach(section => {
        carousel.appendChild(section);
    });

    // Handle numeric features
    if (descriptor.numeric && Object.keys(descriptor.numeric).length > 0) {
        Object.entries(descriptor.numeric).forEach(([featureName, details]) => {
            createNumericInput(sections.numeric, featureName, details);
        });
    } else {
        sections.numeric.style.display = 'none';
    }

    // Handle categorical features
    if (descriptor.categorical && Object.keys(descriptor.categorical).length > 0) {
        Object.entries(descriptor.categorical).forEach(([featureName, details]) => {
            createCategoricalInput(sections.categorical, featureName, details);
        });
    } else {
        sections.categorical.style.display = 'none';
    }

    // Handle ordinal features
    if (descriptor.ordinal && Object.keys(descriptor.ordinal).length > 0) {
        Object.entries(descriptor.ordinal).forEach(([featureName, details]) => {
            createOrdinalInput(sections.ordinal, featureName, details);
        });
    } else {
        sections.ordinal.style.display = 'none';
    }
}

function createSection(title, id) {
    const section = document.createElement('div');
    section.className = 'feature-section';
    section.id = id;
    
    const header = document.createElement('h3');
    header.className = 'feature-section-header';
    header.textContent = title;
    
    const content = document.createElement('div');
    content.className = 'feature-section-content';
    
    section.appendChild(header);
    section.appendChild(content);
    
    return section;
}

function createNumericInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box numeric-feature";
    
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.id = `feature-${featureName}`;
    input.min = details.min;
    input.max = details.max;
    
    // Add data statistics as title tooltip
    const stats = `Min: ${details.min}
Max: ${details.max}
Mean: ${details.mean.toFixed(2)}
Median: ${details.median}
Std: ${details.std.toFixed(2)}`;

    box.innerHTML = `
        <div class="feature-label" title="${stats}">
            ${featureName}
            <span class="feature-type">Numeric</span>
            <div class="feature-range">Range: ${details.min} - ${details.max}</div>
        </div>
    `;
    box.appendChild(input);

    input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value < details.min || value > details.max) {
            input.classList.add('invalid');
            input.title = `Value must be between ${details.min} and ${details.max}`;
        } else {
            input.classList.remove('invalid');
            input.title = '';
        }
    });

    container.querySelector('.feature-section-content').appendChild(box);
}

function createCategoricalInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box categorical-feature";
    
    const select = document.createElement("select");
    select.id = `feature-${featureName}`;
    
    // Add placeholder option
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a value";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    
    // Add options based on distinct values
    details.distinct_values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    box.innerHTML = `
        <div class="feature-label">
            ${featureName}
            <span class="feature-type">Categorical</span>
            <div class="feature-values">${details.distinct_values.length} possible values</div>
        </div>
    `;
    box.appendChild(select);
    container.querySelector('.feature-section-content').appendChild(box);
}

function createOrdinalInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box ordinal-feature";
    
    const select = document.createElement("select");
    select.id = `feature-${featureName}`;
    
    // Add placeholder option
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a value";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    
    // Add options based on ordered values
    details.ordered_values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    box.innerHTML = `
        <div class="feature-label">
            ${featureName}
            <span class="feature-type">Ordinal</span>
            <div class="feature-values">Order: ${details.ordered_values.join(' → ')}</div>
        </div>
    `;
    box.appendChild(select);
    container.querySelector('.feature-section-content').appendChild(box);
}

// Function to get all feature values
window.getFeatureValues = function() {
    const values = {};
    
    if (featureDescriptor.numeric) {
        Object.keys(featureDescriptor.numeric).forEach(feature => {
            const input = document.getElementById(`feature-${feature}`);
            values[feature] = parseFloat(input.value);
        });
    }
    
    if (featureDescriptor.categorical) {
        Object.keys(featureDescriptor.categorical).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }
    
    if (featureDescriptor.ordinal) {
        Object.keys(featureDescriptor.ordinal).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }
    
    return values;
}

window.resetFeatures = function() {
    if (featureDescriptor.numeric) {
        Object.entries(featureDescriptor.numeric).forEach(([feature, details]) => {
            const input = document.getElementById(`feature-${feature}`);
            input.value = details.mean || details.median || '';
            input.classList.remove('invalid');
        });
    }
    
    if (featureDescriptor.categorical) {
        Object.keys(featureDescriptor.categorical).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            select.selectedIndex = 0;
        });
    }
    
    if (featureDescriptor.ordinal) {
        Object.keys(featureDescriptor.ordinal).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            select.selectedIndex = 0;
        });
    }
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
