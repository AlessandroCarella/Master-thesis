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

let state = null;

export function initializeUI(appState) {
    state = appState;
}

export function getState() {
    return state;
}

export function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");

    // Exit if carousel element doesn't exist
    if (!carousel) {
        console.error("Feature carousel element not found");
        return;
    }

    // Clear the carousel
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
