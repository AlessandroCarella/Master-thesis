/**
 * @fileoverview API communication layer for machine learning model explanation service.
 * Provides unified interface for dataset operations, model training, and explanation generation.
 * @author Generated documentation
 * @module API
 */

/**
 * Base URL for all API endpoints
 * @constant {string}
 */
export const API_BASE = "http://127.0.0.1:8000/api";

/**
 * Generic fetch wrapper with error handling and JSON parsing.
 * Automatically handles HTTP error responses and returns parsed JSON.
 * 
 * @async
 * @param {string} url - Complete URL for the request
 * @param {Object} [options={}] - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} When HTTP request fails or returns error status
 * @example
 * const data = await fetchJSON('/api/datasets');
 * // Returns parsed JSON response
 * 
 * @example
 * const result = await fetchJSON('/api/train', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(trainingData)
 * });
 */
export const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

/**
 * Fetches list of available datasets from the server.
 * 
 * @async
 * @returns {Promise<Array<string>>} Array of dataset names
 * @throws {Error} When datasets cannot be fetched
 * @example
 * const datasets = await fetchDatasets();
 * // Returns: ['iris', 'wine', 'breast_cancer']
 * 
 * @see fetchJSON
 */
export const fetchDatasets = () => fetchJSON(`${API_BASE}/get-datasets`);

/**
 * Fetches list of available classifiers from the server.
 * 
 * @async
 * @returns {Promise<Array<string>>} Array of classifier names
 * @throws {Error} When classifiers cannot be fetched
 * @example
 * const classifiers = await fetchClassifiers();
 * // Returns: ['RandomForest', 'SVM', 'LogisticRegression']
 * 
 * @see fetchJSON
 */
export const fetchClassifiers = () => fetchJSON(`${API_BASE}/get-classifiers`);

/**
 * Fetches detailed information about a specific dataset.
 * Includes feature descriptions, statistics, and metadata.
 * 
 * @async
 * @param {string} datasetName - Name of the dataset
 * @returns {Promise<Object>} Dataset information object
 * @throws {Error} When dataset info cannot be fetched
 * @example
 * const info = await fetchDatasetInfo('iris');
 * // Returns: { features: [...], shape: [150, 4], ... }
 * 
 * @see fetchJSON
 */
export const fetchDatasetInfo = async (datasetName) => {
    const infoResponse = await fetch(
        `${API_BASE}/get-dataset-info/${datasetName}`
    );
    return await infoResponse.json();
};

/**
 * Fetches classifier parameters and their default values.
 * Used to populate parameter configuration forms.
 * 
 * @async
 * @returns {Promise<Object>} Classifier parameters configuration
 * @throws {Error} When parameters cannot be fetched
 * @example
 * const params = await fetchClassifierParameters();
 * // Returns: { classifiers: { RandomForest: { n_estimators: 100 } } }
 * 
 * @see fetchJSON
 */
export const fetchClassifierParameters = async () =>
    fetchJSON(`${API_BASE}/get-classifiers`);

/**
 * Trains a machine learning model with the provided configuration.
 * Returns training results including feature descriptors.
 * 
 * @async
 * @param {Object} trainingData - Complete training configuration
 * @param {string} trainingData.dataset_name - Dataset to train on
 * @param {string} trainingData.selectedClassifier - Classifier type
 * @param {Object} trainingData.parameters - Classifier parameters
 * @returns {Promise<Object>} Training results with descriptor
 * @throws {Error} When training fails
 * @example
 * const result = await trainModel({
 *   dataset_name: 'iris',
 *   selectedClassifier: 'RandomForest',
 *   parameters: { n_estimators: 100 }
 * });
 * // Returns: { descriptor: {...}, accuracy: 0.95 }
 * 
 * @see fetchJSON
 */
export const trainModel = async (trainingData) =>
    fetchJSON(`${API_BASE}/train-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingData),
    });

/**
 * Generates explanation for an instance using unified explanation endpoint.
 * Handles both provided instances and user-input instances.
 * 
 * @async
 * @param {Object} requestData - Complete explanation request
 * @param {string} requestData.dataset_name - Dataset name
 * @param {number} requestData.neighbourhood_size - Size of neighborhood for surrogate
 * @param {number} requestData.scatterPlotStep - Step size for scatter plot
 * @param {string} requestData.scatterPlotMethod - Dimensionality reduction method
 * @param {boolean} requestData.includeOriginalDataset - Include original points
 * @param {boolean} requestData.keepDuplicates - Keep duplicate points
 * @param {Object} [requestData.instance] - Instance to explain (optional for provided instances)
 * @returns {Promise<Object>} Explanation results with visualizations
 * @throws {Error} When explanation generation fails
 * @example
 * const explanation = await fetchExplanation({
 *   dataset_name: 'iris',
 *   neighbourhood_size: 100,
 *   scatterPlotMethod: 'umap',
 *   instance: { sepal_length: 5.1, sepal_width: 3.5 }
 * });
 * // Returns: { decisionTreeVisualizationData: {...}, encodedInstance: {...} }
 * 
 * @see fetchJSON
 */
export const fetchExplanation = async (requestData) => {
    const response = await fetchJSON(`${API_BASE}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
    });
    
    return response;
};

/**
 * Fetches class colors for visualization consistency.
 * Colors are method-specific to maintain consistency across different dimensionality reduction techniques.
 * 
 * @async
 * @param {string} [method='umap'] - Dimensionality reduction method
 * @returns {Promise<Array<string>>} Array of color values
 * @throws {Error} When colors cannot be fetched
 * @example
 * const colors = await fetchClassColors('pca');
 * // Returns: ['#1f77b4', '#ff7f0e', '#2ca02c']
 * 
 * @see fetchJSON
 */
export const fetchClassColors = (method = 'umap') =>
    fetchJSON(`${API_BASE}/get-classes-colors?method=${method}`);

/**
 * Updates visualization data when scatter plot method changes.
 * Fetches new transformed coordinates without re-training the model.
 * 
 * @async
 * @param {Object} requestData - Visualization update request
 * @param {string} requestData.dataset_name - Dataset name
 * @param {number} requestData.scatterPlotStep - Step size for scatter plot
 * @param {string} requestData.scatterPlotMethod - New dimensionality reduction method
 * @param {boolean} requestData.includeOriginalDataset - Include original points
 * @returns {Promise<Object>} Updated visualization data
 * @throws {Error} When visualization update fails
 * @example
 * const updatedViz = await fetchVisualizationUpdate({
 *   dataset_name: 'iris',
 *   scatterPlotMethod: 'pca',
 *   scatterPlotStep: 0.1,
 *   includeOriginalDataset: true
 * });
 * // Returns: { scatterPlotVisualizationData: {...}, uniqueClasses: [...] }
 * 
 * @see fetchJSON
 */
export async function fetchVisualizationUpdate(requestData) {
    try {
        const response = await fetch(`${API_BASE}/update-visualization`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.error || "Failed to update visualization"
            );
        }

        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error("Error updating visualization:", error);
        throw error;
    }
}

/**
 * Checks if custom data has been loaded into the application.
 * Used to determine if the normal dataset selection flow should be bypassed.
 * 
 * @async
 * @returns {Promise<Object>} Custom data status information
 * @returns {Promise<Object>} result - Status object
 * @returns {Promise<boolean>} result.custom_data_loaded - Whether custom data is loaded
 * @returns {Promise<boolean>} result.instance_provided - Whether instance was provided
 * @returns {Promise<string>} [result.dataset_name] - Name of custom dataset
 * @returns {Promise<Object>} [result.descriptor] - Feature descriptor
 * @returns {Promise<Object>} [result.provided_instance] - Pre-provided instance data
 * @throws {Error} When status check fails
 * @example
 * const status = await checkCustomData();
 * if (status.custom_data_loaded) {
 *   // Skip dataset selection, use custom data
 * }
 * 
 * @see fetchJSON
 */
export async function checkCustomData() {
    try {
        const response = await fetch(`${API_BASE}/check-custom-data`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error checking custom data:", error);
        return { custom_data_loaded: false, instance_provided: false };
    }
}
