/**
 * @fileoverview User interface components and feature input management.
 * Provides centralized UI creation, state management, and feature input handling for the application.
 * @author Generated documentation
 * @module UI
 */

import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
} from "./UIHelpers/grids.js";

import { createSection } from "./UIHelpers/inputs.js";

import {
    renderFeatureSections,
    setDefaultFeatureValues,
    getFeatureValues,
    resetFeatures,
    getSurrogateParameters,
    getVisualizationSettings,
} from "./UIHelpers/featureManagement.js";

/**
 * Current application state reference
 * @type {Object|null}
 * @private
 */
let state = null;

/**
 * Sets the global application state for UI components.
 * Provides centralized state management for feature inputs and UI components.
 * 
 * @param {Object} appState - Application state object
 * @param {string} appState.dataset_name - Current dataset name
 * @param {string} appState.selectedClassifier - Selected classifier type
 * @param {Object} appState.parameters - Classifier parameters
 * @param {Object} appState.featureDescriptor - Feature descriptions and types
 * @example
 * setState({
 *   dataset_name: 'iris',
 *   selectedClassifier: 'RandomForest',
 *   parameters: { n_estimators: 100 },
 *   featureDescriptor: { numeric: {...}, categorical: {...} }
 * });
 */
export function setState(appState) {
    state = appState;
}

/**
 * Gets the current application state.
 * 
 * @returns {Object|null} Current application state or null if not set
 * @example
 * const currentState = getState();
 * if (currentState && currentState.dataset_name) {
 *   console.log('Current dataset:', currentState.dataset_name);
 * }
 */
export function getState() {
    return state;
}

/**
 * Creates feature input interface based on dataset descriptor.
 * Organizes features by type (numeric, categorical, ordinal) and renders appropriate input controls.
 * 
 * @param {Object} descriptor - Dataset feature descriptor
 * @param {Object} [descriptor.numeric] - Numeric feature definitions
 * @param {Object} [descriptor.categorical] - Categorical feature definitions
 * @param {Object} [descriptor.ordinal] - Ordinal feature definitions
 * @throws {Error} When feature carousel element is not found or descriptor is invalid
 * @example
 * createFeatureInputs({
 *   numeric: { 
 *     sepal_length: { min: 4.0, max: 8.0, default: 5.8 }
 *   },
 *   categorical: {
 *     species: { distinct_values: ['setosa', 'versicolor', 'virginica'], default: 'setosa' }
 *   }
 * });
 * // Creates organized feature input sections
 * 
 * @see renderFeatureSections
 * @see setDefaultFeatureValues
 */
export function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");

    if (!carousel) {
        console.error("Feature carousel element not found");
        return;
    }

    carousel.innerHTML = "";

    try {
        const sections = {
            numeric: createSection("Numeric Features", "numeric-features"),
            categorical: createSection(
                "Categorical Features",
                "categorical-features"
            ),
            ordinal: createSection("Ordinal Features", "ordinal-features"),
        };

        Object.values(sections).forEach((section) => {
            if (carousel) {
                carousel.appendChild(section);
            }
        });

        renderFeatureSections(descriptor, sections);
        setDefaultFeatureValues(descriptor);
    } catch (error) {
        console.error("Error creating feature inputs:", error);
        if (carousel) {
            carousel.innerHTML = `<div class="error-message">Error loading feature inputs: ${error.message}</div>`;
        }
    }
}

// Re-export helper functions from sub-modules for centralized access
export {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
    getFeatureValues,
    resetFeatures,
    getSurrogateParameters,
    getVisualizationSettings,
};
