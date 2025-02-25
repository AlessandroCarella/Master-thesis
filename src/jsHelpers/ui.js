import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
} from "./UIHelpers/grids.js";

import { createSection } from "./UIHelpers/inputs.js";

import { createImageUploadInterface } from "./UIHelpers/imageUpload.js";
import {
    renderFeatureSections,
    setDefaultFeatureValues,
    getFeatureValues,
    resetFeatures,
    getSurrogateParameters,
} from "./UIHelpers/featureManagement.js";

let state = null;

export function initializeUI(appState) {
    state = appState;
}

export function getState() {
    return state;
}

export function createFeatureInputs(descriptor, datasetType) {
    const carousel = document.getElementById("featureCarousel");

    // Exit if carousel element doesn't exist
    if (!carousel) {
        console.error("Feature carousel element not found");
        return;
    }

    // Clear the carousel
    carousel.innerHTML = "";

    // Use datasetType from state if not provided
    if (!datasetType) {
        datasetType = state.datasetType;
    }

    // If the dataset is an image type, display image upload interface
    if (datasetType === "image") {
        createImageUploadInterface(carousel);
        return;
    } else {
        // Regular flow for non-image datasets
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
}

export {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
    getFeatureValues,
    resetFeatures,
    getSurrogateParameters,
};
