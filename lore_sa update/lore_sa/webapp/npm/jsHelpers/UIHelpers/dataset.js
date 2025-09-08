/**
 * @fileoverview Dataset panel management utilities for handling dataset information display and interactions
 * @module dataset
 * @author Generated documentation
 */

import { fetchJSON, API_BASE } from "../API.js";

/**
 * Closes the dataset panel if it's currently visible
 * @description Removes the 'visible' class from the dataset panel to hide it
 * @returns {void}
 * @example
 * closeDatasetPanelIfVisible();
 */
export const closeDatasetPanelIfVisible = () => {
    const datasetPanel = document.getElementById("datasetPanel");
    if (datasetPanel.classList.contains("visible")) {
        datasetPanel.classList.remove("visible");
    }
};

/**
 * Displays a loading spinner and message in the dataset info panel
 * @description Shows loading state while dataset information is being fetched
 * @returns {void}
 * @example
 * showDatasetLoading();
 */
export const showDatasetLoading = () => {
    updateDatasetInfoContent(`
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <span class="loading-text">Loading dataset information...</span>
        </div>
    `);
};

/**
 * Updates the innerHTML content of the dataset info div and makes it visible
 * @description Internal utility function for updating dataset panel content
 * @param {string} htmlContent - The HTML content to display in the dataset info panel
 * @returns {void}
 * @private
 */
const updateDatasetInfoContent = (htmlContent) => {
    const datasetInfoDiv = document.getElementById("datasetInfo");
    datasetInfoDiv.innerHTML = htmlContent;
    datasetInfoDiv.style.display = "block";
};

/**
 * Updates the dataset information panel with dataset details
 * @description Displays dataset name, sample count, features, and target information with a show dataset button
 * @param {string} datasetName - The name of the dataset
 * @param {Object} datasetInfo - Object containing dataset metadata
 * @param {number} datasetInfo.n_samples - Number of samples in the dataset
 * @param {string[]|string} datasetInfo.feature_names - Array of feature names or single feature name
 * @param {string[]|string} datasetInfo.target_names - Array of target names or single target name
 * @returns {void}
 * @example
 * updateDatasetInfoPanel("iris", {
 *   n_samples: 150,
 *   feature_names: ["sepal_length", "sepal_width", "petal_length", "petal_width"],
 *   target_names: ["setosa", "versicolor", "virginica"]
 * });
 */
export const updateDatasetInfoPanel = (datasetName, datasetInfo) => {
    const featureNames = formatFeatureNames(datasetInfo.feature_names);
    const targetNames = formatFeatureNames(datasetInfo.target_names);

    updateDatasetInfoContent(`
        <h3>Dataset: ${datasetName}</h3>
        <p>Samples: ${datasetInfo.n_samples}</p>
        <p>Features: ${featureNames}</p>
        <p>Target: ${targetNames}</p>
        <button id="showDatasetBtn" class="show-dataset-btn btn">Show Dataset</button>
    `);
};

/**
 * Formats feature names for display, handling both arrays and single strings
 * @description Converts feature names to a comma-separated string if they're in an array
 * @param {string[]|string} names - Feature names as array or single string
 * @returns {string} Comma-separated string of feature names
 * @example
 * formatFeatureNames(["feature1", "feature2"]); // Returns "feature1, feature2"
 * formatFeatureNames("single_feature"); // Returns "single_feature"
 */
const formatFeatureNames = (names) => {
    return Array.isArray(names) ? names.join(", ") : names;
};

/**
 * Displays an error message when dataset information fails to load
 * @description Shows error state with dataset name and retry message
 * @param {string} datasetName - The name of the dataset that failed to load
 * @returns {void}
 * @example
 * handleDatasetInfoError("iris");
 */
export const handleDatasetInfoError = (datasetName) => {
    updateDatasetInfoContent(`
        <h3>Error loading dataset: ${datasetName}</h3>
        <p>Failed to load dataset information. Please try again.</p>
    `);
};

/**
 * Creates an HTML table from array of data objects
 * @description Generates a complete HTML table with headers and data rows from object array
 * @param {Object[]} data - Array of objects where each object represents a row
 * @returns {string} HTML string containing the complete table markup
 * @throws {Error} Returns error message HTML if data is invalid
 * @example
 * const data = [
 *   { name: "John", age: 30, city: "NYC" },
 *   { name: "Jane", age: 25, city: "LA" }
 * ];
 * createTableFromData(data); // Returns HTML table string
 */
export const createTableFromData = (data) => {
    if (!data || !data.length) return "<p>No data available.</p>";
    const keys = Object.keys(data[0]);

    const headerRow = keys.map((key) => `<th>${key}</th>`).join("");
    const rows = data
        .map((record) => {
            return `<tr>${keys
                .map((key) => `<td>${record[key]}</td>`)
                .join("")}</tr>`;
        })
        .join("");

    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
};

/**
 * Attaches all necessary event listeners for the dataset panel
 * @description Sets up click handlers for show dataset and close panel buttons
 * @returns {void}
 * @example
 * attachDatasetPanelEventListeners();
 */
export const attachDatasetPanelEventListeners = () => {
    attachShowDatasetButtonListener();
    attachCloseDatasetPanelListener();
};

/**
 * Attaches click event listener to the show dataset button
 * @description Handles showing the full dataset in a modal panel when button is clicked
 * @returns {void}
 * @async
 * @throws {Error} Logs errors to console if dataset fetching fails
 * @private
 */
const attachShowDatasetButtonListener = () => {
    const showDatasetBtn = document.getElementById("showDatasetBtn");
    if (!showDatasetBtn) return;

    showDatasetBtn.addEventListener("click", async () => {
        try {
            const datasetName = window.appState.dataset_name || "Dataset";
            document.getElementById(
                "datasetPanelTitle"
            ).textContent = `The ${datasetName} dataset`;

            const result = await fetchJSON(`${API_BASE}/get-selected-dataset`);
            if (result.error) {
                alert(result.error);
                return;
            }

            document.getElementById("datasetPanelContent").innerHTML =
                createTableFromData(result.dataset);

            document.getElementById("datasetPanel").classList.add("visible");
        } catch (error) {
            console.error("Error fetching dataset:", error);
        }
    });
};

/**
 * Attaches click event listener to the close dataset panel button
 * @description Sets up the close button to hide the dataset panel when clicked
 * @returns {void}
 * @private
 */
const attachCloseDatasetPanelListener = () => {
    const closeDatasetPanel = document.getElementById("closeDatasetPanel");
    if (closeDatasetPanel) {
        closeDatasetPanel.addEventListener("click", closeDatasetPanelIfVisible);
    }
};
