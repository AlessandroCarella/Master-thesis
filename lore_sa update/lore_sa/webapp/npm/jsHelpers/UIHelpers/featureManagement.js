/**
 * @fileoverview Feature management utilities for rendering feature inputs, getting values, and handling parameters
 * @module featureManagement
 * @author Generated documentation
 */

import { getState } from "../ui.js";
import { createNumericInput, createCategoricalInput, createOrdinalInput } from "./inputs.js";

/**
 * Renders feature input sections based on feature descriptor types
 * @description Creates appropriate input controls for numeric, categorical, and ordinal features
 * @param {Object} descriptor - Feature descriptor containing feature type definitions
 * @param {Object} descriptor.numeric - Numeric features with their properties
 * @param {Object} descriptor.categorical - Categorical features with their properties  
 * @param {Object} descriptor.ordinal - Ordinal features with their properties
 * @param {Object} sections - DOM section containers for different feature types
 * @param {HTMLElement} sections.numeric - Container for numeric feature inputs
 * @param {HTMLElement} sections.categorical - Container for categorical feature inputs
 * @param {HTMLElement} sections.ordinal - Container for ordinal feature inputs
 * @returns {void}
 * @example
 * const descriptor = {
 *   numeric: { "age": { min: 18, max: 100, median: 35 } },
 *   categorical: { "gender": { distinct_values: ["M", "F"] } }
 * };
 * const sections = {
 *   numeric: document.getElementById("numericSection"),
 *   categorical: document.getElementById("categoricalSection"),
 *   ordinal: document.getElementById("ordinalSection")
 * };
 * renderFeatureSections(descriptor, sections);
 */
export function renderFeatureSections(descriptor, sections) {
    if (descriptor.numeric && Object.keys(descriptor.numeric).length > 0) {
        Object.entries(descriptor.numeric).forEach(([featureName, details]) => {
            createNumericInput(sections.numeric, featureName, details);
        });
    } else {
        sections.numeric.style.display = "none";
    }

    if (
        descriptor.categorical &&
        Object.keys(descriptor.categorical).length > 0
    ) {
        Object.entries(descriptor.categorical).forEach(
            ([featureName, details]) => {
                createCategoricalInput(
                    sections.categorical,
                    featureName,
                    details
                );
            }
        );
    } else {
        sections.categorical.style.display = "none";
    }

    if (descriptor.ordinal && Object.keys(descriptor.ordinal).length > 0) {
        Object.entries(descriptor.ordinal).forEach(([featureName, details]) => {
            createOrdinalInput(sections.ordinal, featureName, details);
        });
    } else {
        sections.ordinal.style.display = "none";
    }
}

/**
 * Calculates the mode (most frequent value) from an array of values
 * @description Finds the most frequently occurring value in the array
 * @param {Array} values - Array of values to analyze
 * @returns {*} The most frequently occurring value
 * @example
 * getMode([1, 2, 2, 3, 2]); // Returns 2
 * getMode(["A", "B", "A", "C"]); // Returns "A"
 * @private
 */
function getMode(values) {
    const counts = values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    const modes = Object.keys(counts).filter((key) => counts[key] === maxCount);

    return modes[0];
}

/**
 * Sets default values for all feature inputs based on statistical measures
 * @description Sets median for numeric features and mode for categorical/ordinal features
 * @param {Object} descriptor - Feature descriptor containing feature definitions and statistics
 * @param {Object} descriptor.numeric - Numeric features with median values
 * @param {Object} descriptor.categorical - Categorical features with distinct values
 * @param {Object} descriptor.ordinal - Ordinal features with ordered values
 * @returns {void}
 * @example
 * setDefaultFeatureValues({
 *   numeric: { "age": { median: 35.5 } },
 *   categorical: { "gender": { distinct_values: ["M", "F", "M", "M"] } }
 * });
 */
export function setDefaultFeatureValues(descriptor) {
    if (descriptor.numeric) {
        Object.entries(descriptor.numeric).forEach(([feature, details]) => {
            const input = document.getElementById(`feature-${feature}`);
            input.value = details.median.toFixed(2) || "";
        });
    }

    if (descriptor.categorical) {
        Object.entries(descriptor.categorical).forEach(([feature, details]) => {
            const select = document.getElementById(`feature-${feature}`);
            const modeValue = getMode(details.distinct_values);

            Array.from(select.options).forEach((option, index) => {
                if (option.value === modeValue) {
                    select.selectedIndex = index;
                }
            });
        });
    }

    if (descriptor.ordinal) {
        Object.entries(descriptor.ordinal).forEach(([feature, details]) => {
            const select = document.getElementById(`feature-${feature}`);
            const modeValue = getMode(details.ordered_values);

            Array.from(select.options).forEach((option, index) => {
                if (option.value === modeValue) {
                    select.selectedIndex = index;
                }
            });
        });
    }
}

/**
 * Retrieves current values from all feature input controls
 * @description Collects values from numeric, categorical, and ordinal feature inputs
 * @returns {Object} Object mapping feature names to their current values
 * @example
 * const values = getFeatureValues();
 * // Returns: { "age": 35.5, "gender": "M", "education": "Bachelor" }
 */
export function getFeatureValues() {
    const state = getState();
    if (!state?.featureDescriptor) return {};

    const descriptor = state.featureDescriptor;
    const values = {};

    if (descriptor.numeric) {
        Object.keys(descriptor.numeric).forEach((feature) => {
            const input = document.getElementById(`feature-${feature}`);
            values[feature] = parseFloat(input.value);
        });
    }

    if (descriptor.categorical) {
        Object.keys(descriptor.categorical).forEach((feature) => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }

    if (descriptor.ordinal) {
        Object.keys(descriptor.ordinal).forEach((feature) => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }

    return values;
}

/**
 * Resets all feature inputs to their default values
 * @description Restores feature inputs to their statistical defaults (median/mode)
 * @returns {void}
 * @example
 * resetFeatures();
 */
export function resetFeatures() {
    const state = getState();
    if (!state?.featureDescriptor) return;

    setDefaultFeatureValues(state.featureDescriptor);
}

/**
 * Retrieves current surrogate model parameters from UI controls
 * @description Collects neighborhood size, scatter plot step, and boolean options
 * @returns {Object} Object containing surrogate model configuration
 * @returns {number} returns.neighbourhood_size - Size of the generated neighborhood
 * @returns {number} returns.scatterPlotStep - Step size for decision boundary visualization
 * @returns {boolean} returns.includeOriginalDataset - Whether to include original dataset points
 * @returns {boolean} returns.keepDuplicates - Whether to retain duplicate points
 * @example
 * const params = getSurrogateParameters();
 * // Returns: { neighbourhood_size: 500, scatterPlotStep: 0.1, includeOriginalDataset: false, keepDuplicates: false }
 */
export function getSurrogateParameters() {
    return {
        neighbourhood_size: parseFloat(
            document.getElementById("surrogate-neighbourhood_size").value
        ),
        scatterPlotStep: parseFloat(
            document.getElementById("surrogate-scatterPlotStep").value
        ),
        includeOriginalDataset: document.getElementById("surrogate-includeOriginalDataset").value === "Yes",
        keepDuplicates: document.getElementById("surrogate-keepDuplicates").value == "Yes",
    };
}

/**
 * Gets current visualization toggle settings from UI checkboxes
 * @description Reads which visualizations are currently enabled for display
 * @returns {Object} Object containing boolean flags for each visualization type
 * @returns {boolean} returns.scatterPlot - Whether 2D scatter plot is enabled
 * @returns {boolean} returns.blocksTree - Whether blocks decision tree is enabled
 * @returns {boolean} returns.classicTree - Whether classic decision tree is enabled
 * @returns {boolean} returns.treeSpawn - Whether TreeSpawn decision tree is enabled
 * @example
 * const settings = getVisualizationSettings();
 * // Returns: { scatterPlot: true, blocksTree: false, classicTree: true, treeSpawn: false }
 */
export function getVisualizationSettings() {
    return {
        scatterPlot: document.getElementById("viz-scatterPlot")?.checked || false,
        blocksTree: document.getElementById("viz-blocksTree")?.checked || false,
        classicTree: document.getElementById("viz-classicTree")?.checked || false,
        treeSpawn: document.getElementById("viz-treeSpawn")?.checked || false,
    };
}

/**
 * Gets current dimensionality reduction parameters from UI controls
 * @description Collects the selected method and its specific parameters
 * @returns {Object} Object containing dimensionality reduction configuration
 * @returns {string} returns.method - Selected dimensionality reduction method
 * @returns {Object} returns.parameters - Method-specific parameters
 * @example
 * const dimReductionParams = getDimensionalityReductionParameters();
 * // Returns: { 
 * //   method: "UMAP", 
 * //   parameters: { n_neighbors: 15, min_dist: 0.1, spread: 1.0 }
 * // }
 */
export function getDimensionalityReductionParameters() {
    const methodSelect = document.getElementById("dimreduction-method");
    if (!methodSelect) {
        return { method: "umap", parameters: {} };
    }

    const selectedMethod = methodSelect.value;
    const parameters = {};

    // Get all parameter inputs for the selected method
    const parameterInputs = document.querySelectorAll(
        `[id^="dimreduction-${selectedMethod.toLowerCase()}-"]`
    );

    parameterInputs.forEach((input) => {
        const paramName = input.id.split('-').slice(2).join('_'); // Get parameter name from id
        
        if (input.type === "number") {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                parameters[paramName] = value;
            }
        } else if (input.tagName === "SELECT") {
            let value = input.value;
            
            // Convert string boolean values to actual booleans
            if (value === "True") {
                value = true;
            } else if (value === "False") {
                value = false;
            }
            // Convert numeric strings to numbers where appropriate
            else if (!isNaN(value) && value !== "") {
                value = parseFloat(value);
            }
            
            parameters[paramName] = value;
        }
    });

    return {
        method: selectedMethod.toLowerCase(), // Convert to lowercase for consistency with backend
        parameters: parameters
    };
}
