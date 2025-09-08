/**
 * @fileoverview UI reset utilities for cleaning up interface state during workflow transitions
 * @module reset
 * @author Generated documentation
 */

import { setGlobalColorMap } from "../visualizationConnectorHelpers/colors.js";
import { resetVisualizationState } from "../visualizationConnector.js";

/**
 * Resets UI to initial state when a new dataset is selected
 * @description Hides and clears classifier selection, parameters, features, and visualizations
 * @param {Object} appState - Application state object to reset
 * @param {string|null} appState.selectedClassifier - Currently selected classifier (will be set to null)
 * @param {Object} appState.parameters - Classifier parameters (will be cleared)
 * @param {Object|null} appState.featureDescriptor - Feature descriptor (will be set to null)
 * @returns {void}
 * @example
 * resetUIDatasetSelection(appState);
 */
export const resetUIDatasetSelection = (appState) => {
    const classifierSection = document.getElementById("classifierSection");
    if (classifierSection) {
        classifierSection.style.display = "none";
    }

    const parameterSection = document.getElementById("parameterSection");
    if (parameterSection) {
        parameterSection.style.display = "none";
    }
    const parameterForm = document.getElementById("parameterForm");
    if (parameterForm) {
        parameterForm.innerHTML = "";
    }

    const featureContainer = document.getElementById("featureButtonContainer");
    if (featureContainer) {
        featureContainer.style.display = "none";
    }
    const featureCarousel = document.getElementById("featureCarousel");
    if (featureCarousel) {
        featureCarousel.innerHTML = "";
    }

    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }

    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    clearVisualizationContainers();

    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;

    setGlobalColorMap(null);
    resetVisualizationState();
};

/**
 * Resets UI elements when a new classifier is selected
 * @description Clears feature inputs, surrogate parameters, and visualizations while preserving classifier selection
 * @param {Object} appState - Application state object to partially reset
 * @param {Object|null} appState.featureDescriptor - Feature descriptor (will be set to null)
 * @returns {void}
 * @example
 * resetUISelectClassifier(appState);
 */
export const resetUISelectClassifier = (appState) => {
    const featureContainer = document.getElementById("featureButtonContainer");
    if (featureContainer) {
        featureContainer.style.display = "none";
    }
    const featureCarousel = document.getElementById("featureCarousel");
    if (featureCarousel) {
        featureCarousel.innerHTML = "";
    }

    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }

    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    clearVisualizationContainers();

    appState.featureDescriptor = null;
    resetVisualizationState();
};

/**
 * Resets UI elements when training starts
 * @description Clears surrogate parameters and visualization containers during training process
 * @returns {void}
 * @example
 * resetUIstartTraining();
 */
export const resetUIstartTraining = () => {
    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }
    
    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    clearVisualizationContainers();
    resetVisualizationState();
};

/**
 * Clears all visualization containers with null safety checks
 * @description Helper function to safely clear all visualization DOM containers
 * @returns {void}
 * @private
 */
function clearVisualizationContainers() {
    const visualizationIds = [
        "scatter-plot",
        "blocks-tree-plot", 
        "classic-tree-plot",
        "treespawn-tree-plot"
    ];
    
    visualizationIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = "";
        }
    });
}
