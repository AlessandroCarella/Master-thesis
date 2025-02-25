import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
} from "./UIHelpers/grids.js";

import {
    createSection,
} from "./UIHelpers/inputs.js";

import { getDatasetType } from "./visualizationConnector.js";
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

export function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = "";

    // Get dataset type from the visualization connector
    const datasetType = getDatasetType();

    // If the dataset is an image type, display image upload interface
    if (datasetType === "image") {
        createImageUploadInterface(carousel);
        return;
    } else {
        // Regular flow for non-image datasets
        const sections = {
            numeric: createSection("Numeric Features", "numeric-features"),
            categorical: createSection(
                "Categorical Features",
                "categorical-features"
            ),
            ordinal: createSection("Ordinal Features", "ordinal-features"),
        };

        Object.values(sections).forEach((section) => {
            carousel.appendChild(section);
        });

        renderFeatureSections(descriptor, sections);
        setDefaultFeatureValues(descriptor);
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
