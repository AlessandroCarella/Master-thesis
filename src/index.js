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
 *              UI RESET FUNCTIONS
 ********************************************/
const resetUIDatasetSelection = () => {
    // Hide classifier section
    document.getElementById("classifierSection").style.display = "none";

    // Hide and reset parameter section
    const parameterSection = document.getElementById("parameterSection");
    parameterSection.style.display = "none";
    document.getElementById("parameterForm").innerHTML = "";

    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    featureContainer.style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Clear surrogate parameters container
    document.getElementById("surrogateContainer").innerHTML = "";

    // Hide visualization container and reset visualizations
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset state values
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;

    // Reset the global color map
    setGlobalColorMap(null);
};

const resetUISelectClassifier = () => {
    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    featureContainer.style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Clear surrogate parameters container
    document.getElementById("surrogateContainer").innerHTML = "";

    // Hide visualization container and reset visualizations
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset feature descriptor in the state
    appState.featureDescriptor = null;
};

const resetUIstartTraining = () => {
    // Clear surrogate parameters container and visualization container
    document.getElementById("surrogateContainer").innerHTML = "";
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";
};

/********************************************
 *              API CALLS
 ********************************************/
const API_BASE = "http://127.0.0.1:8000/api";

const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

const fetchDatasets = () => fetchJSON(`${API_BASE}/get-datasets`);
const fetchClassifiers = () => fetchJSON(`${API_BASE}/get-classifiers`);

/********************************************
 *          EVENT HANDLERS
 ********************************************/
// Handle dataset selection
window.selectDataset = async function (datasetName) {
    // Ensure the dataset panel is closed if it's open
    const datasetPanel = document.getElementById("datasetPanel");
    if (datasetPanel.classList.contains("visible")) {
        datasetPanel.classList.remove("visible");
    }

    // Reset UI first
    resetUIDatasetSelection();

    // Update state with new dataset
    appState.dataset_name = datasetName;

    // Hide the dataset info panel until data is loaded
    const datasetInfoDiv = document.getElementById("datasetInfo");
    datasetInfoDiv.style.display = "none";

    try {
        // Show loading indicator
        datasetInfoDiv.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span class="loading-text">Loading dataset information...</span>
            </div>
        `;
        datasetInfoDiv.style.display = "block";

        const infoResponse = await fetch(
            `http://127.0.0.1:8000/api/get-dataset-info/${datasetName}`
        );
        const datasetInfo = await infoResponse.json();

        // Update the content with the loaded data
        datasetInfoDiv.innerHTML = `
            <h3>Dataset: ${datasetName}</h3>
            <p>Samples: ${datasetInfo.n_samples}</p>
            <p>Features: 
            ${
                Array.isArray(datasetInfo.feature_names)
                    ? JSON.parse(
                          JSON.stringify(datasetInfo.feature_names)
                      ).join(", ")
                    : datasetInfo.feature_names
            }
            </p>
            <p>Target: ${JSON.parse(
                JSON.stringify(datasetInfo.target_names)
            ).join(", ")}</p>
            <button id="showDatasetBtn" class="show-dataset-btn btn">Show Dataset</button>
        `;

        // Now show the info panel after data is loaded
        datasetInfoDiv.style.display = "block";

        const classifiers = await fetchClassifiers();
        populateClassifierGrid(classifiers);
        document.getElementById("classifierSection").style.display = "block";

        // Re-attach event listeners if needed
        attachDatasetPanelEventListeners();
    } catch (error) {
        console.error("Error fetching dataset info:", error);
        // Show error in the info div
        const datasetInfoDiv = document.getElementById("datasetInfo");
        datasetInfoDiv.innerHTML = `
            <h3>Error loading dataset: ${datasetName}</h3>
            <p>Failed to load dataset information. Please try again.</p>
        `;
        datasetInfoDiv.style.display = "block";
    }
};

// Handle classifier selection
window.selectClassifier = async (classifierName) => {
    try {
        resetUISelectClassifier();
        appState.selectedClassifier = classifierName;
        appState.parameters = {};

        const data = await fetchJSON(`${API_BASE}/get-classifiers`);
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
window.startTraining = async () => {
    try {
        resetUIstartTraining();

        // Make sure the feature button container exists before modifying it
        const featureContainer = document.getElementById(
            "featureButtonContainer"
        );
        if (featureContainer) {
            featureContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <span class="loading-text">Training model... This may take a moment.</span>
                </div>
            `;
            featureContainer.style.display = "block";
        }

        const trainingData = {
            dataset_name: appState.dataset_name,
            classifier: appState.selectedClassifier,
            parameters: appState.parameters,
        };

        const response = await fetchJSON(`${API_BASE}/train-model`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(trainingData),
        });

        appState.featureDescriptor = response.descriptor;

        // Ensure the feature button container is properly reset and prepared
        if (featureContainer) {
            featureContainer.innerHTML = `
                <div class="feature-carousel" id="featureCarousel"></div>
                <div class="button-group">
                    <button class="reset-btn btn" onclick="resetFeatures()">Reset Features Values</button>
                </div>
                <div id="surrogateContainer"></div>
                <div class="button-group">
                    <button class="submit-btn btn" onclick="explainInstance()">Explain!</button>
                </div>
            `;
        }

        createFeatureInputs(response.descriptor, response.datasetType);

        // Create and show surrogate parameters
        const surrogateContainer =
            document.getElementById("surrogateContainer");
        if (surrogateContainer) {
            populateSurrogateForm(surrogateContainer);
        }

        if (featureContainer) {
            featureContainer.style.display = "block";
        }
    } catch (error) {
        console.error("Training failed:", error);
    }
};

// Explain an instance based on feature values
window.explainInstance = async () => {
    try {
        // Show loading state in visualization container
        const svgContainer = document.querySelector(".svg-container");
        svgContainer.style.display = "block";
        svgContainer.innerHTML = `
            <div class="loading-container full-width">
                <div class="loading-spinner"></div>
                <span class="loading-text">Generating explanation, please wait...</span>
            </div>
        `;

        const instanceData = getFeatureValues();
        const surrogateParams = getSurrogateParameters();

        // Check if we're dealing with image data
        const datasetType =
            appState.dataset_name &&
            appState.dataset_name.toLowerCase().includes("mnist")
                ? "image"
                : "tabular";

        // Prepare the request data
        const requestData = {
            instance: instanceData,
            dataset_name: appState.dataset_name,
            neighbourhood_size: surrogateParams.neighbourhood_size,
            PCAstep: surrogateParams.PCAstep,
        };

        // Handle image data differently
        if (datasetType === "image" && instanceData.image) {
            requestData.instance_type = "image";
            requestData.image = instanceData.image;

            // Verify image dimensions
            if (
                instanceData.imageWidth !== 28 ||
                instanceData.imageHeight !== 28
            ) {
                throw new Error("Image must be 28x28 pixels");
            }
        } else {
            // Regular tabular data
            requestData.instance = instanceData;
        }

        const result = await fetchJSON(`${API_BASE}/explain`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        // Set the global color map using the unique classes predicted by the surrogate model
        setGlobalColorMap(result.uniqueClasses);

        // Restore the original visualization container structure
        svgContainer.innerHTML = `
            <div class="svg-side-by-side">
                <div class="visualization-container">
                    <h2>Neighborhood PCA</h2>
                    <div id="pca-plot"></div>
                    <p id="x-axis-label"></p>
                    <p id="y-axis-label"></p>
                </div>
                <div class="visualization-container">
                    <h2>Surrogate Model</h2>
                    <div id="visualization"></div>
                </div>
            </div>
        `;

        // Initialize visualizations with the results
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
 *        DATASET PANEL HANDLING
 ********************************************/
// Helper to build an HTML table from an array of record objects
const createTableFromData = (data) => {
    if (!data || !data.length) return "<p>No data available.</p>";
    const keys = Object.keys(data[0]);
    let html = "<table><thead><tr>";
    keys.forEach((key) => {
        html += `<th>${key}</th>`;
    });
    html += "</tr></thead><tbody>";
    data.forEach((record) => {
        html += "<tr>";
        keys.forEach((key) => {
            html += `<td>${record[key]}</td>`;
        });
        html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
};

// Attach event listeners for the dataset panel buttons
const attachDatasetPanelEventListeners = (datasets) => {
    const showDatasetBtn = document.getElementById("showDatasetBtn");
    if (showDatasetBtn) {
        showDatasetBtn.addEventListener("click", async () => {
            try {
                // Update the dataset panel title with the selected dataset name
                const datasetName = appState.dataset_name || "Dataset";
                const titleElement =
                    document.getElementById("datasetPanelTitle");
                titleElement.textContent = `The ${datasetName} dataset`;

                // Fetch the dataset and build the table
                const result = await fetchJSON(
                    `${API_BASE}/get-selected-dataset`
                );
                if (result.error) {
                    alert(result.error);
                    return;
                }
                document.getElementById("datasetPanelContent").innerHTML =
                    createTableFromData(result.dataset);
                document
                    .getElementById("datasetPanel")
                    .classList.add("visible");
            } catch (error) {
                console.error("Error fetching dataset:", error);
            }
        });
    }

    // Close button for the dataset panel
    const closeDatasetPanel = document.getElementById("closeDatasetPanel");
    if (closeDatasetPanel) {
        closeDatasetPanel.addEventListener("click", () => {
            document.getElementById("datasetPanel").classList.remove("visible");
        });
    }
};

/********************************************
 *   EXPOSED FUNCTIONS & INITIALIZATION
 ********************************************/
window.updateParameter = updateParameter;
window.getFeatureValues = getFeatureValues;
window.resetFeatures = resetFeatures;

// Initialize UI and attach event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    try {
        initializeUI(appState);
        const datasets = await fetchDatasets();
        populateDatasetGrid(datasets);
        attachDatasetPanelEventListeners(datasets);
    } catch (error) {
        console.error("Failed to load datasets:", error);
    }
});
