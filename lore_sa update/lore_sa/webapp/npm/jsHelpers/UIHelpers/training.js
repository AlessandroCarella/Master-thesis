/**
 * @fileoverview Training workflow utilities for model training display and data preparation
 * @module training
 * @author Generated documentation
 */

/**
 * Displays loading state during model training
 * @description Shows a loading spinner and message while the classifier is being trained
 * @returns {void}
 * @example
 * showTrainingLoading();
 */
export const showTrainingLoading = () => {
    const featureContainer = document.getElementById("featureButtonContainer");
    if (featureContainer) {
        featureContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">Training model... This may take a moment.</span>
        </div>
      `;
        featureContainer.style.display = "block";
    }
};

/**
 * Builds training data payload for the training API
 * @description Creates a structured data object containing all necessary training parameters
 * @param {Object} appState - Current application state containing training configuration
 * @param {string} appState.dataset_name - Name of the dataset to use for training
 * @param {string} appState.selectedClassifier - Name of the selected classifier algorithm
 * @param {Object} appState.parameters - Classifier-specific parameters and their values
 * @returns {Object} Training data object ready for API submission
 * @returns {string} returns.dataset_name - Dataset identifier
 * @returns {string} returns.classifier - Classifier algorithm name
 * @returns {Object} returns.parameters - Classifier configuration parameters
 * @example
 * const trainingData = buildTrainingData({
 *   dataset_name: "iris",
 *   selectedClassifier: "RandomForest",
 *   parameters: { n_estimators: 100, max_depth: 10 }
 * });
 * // Returns: { dataset_name: "iris", classifier: "RandomForest", parameters: {...} }
 */
export const buildTrainingData = (appState) => {
    return {
        dataset_name: appState.dataset_name,
        classifier: appState.selectedClassifier,
        parameters: appState.parameters,
    };
};

/**
 * Updates the UI after successful model training completion
 * @description Replaces loading content with feature input form and explanation controls
 * @param {Object} response - Training response data (currently unused but available for future enhancements)
 * @returns {void}
 * @example
 * updateUIAfterTraining(trainingResponse);
 */
export const updateUIAfterTraining = (response) => {
    const featureContainer = document.getElementById("featureButtonContainer");
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
};
