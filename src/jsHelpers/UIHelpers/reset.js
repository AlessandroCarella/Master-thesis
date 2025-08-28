import { setGlobalColorMap } from "../visualizationConnectorHelpers/colors.js";
import { resetVisualizationState } from "../visualizationConnector.js";

export const resetUIDatasetSelection = (appState) => {
    // Hide classifier section
    const classifierSection = document.getElementById("classifierSection");
    if (classifierSection) {
        classifierSection.style.display = "none";
    }

    // Hide and reset parameter section
    const parameterSection = document.getElementById("parameterSection");
    if (parameterSection) {
        parameterSection.style.display = "none";
    }
    const parameterForm = document.getElementById("parameterForm");
    if (parameterForm) {
        parameterForm.innerHTML = "";
    }

    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    if (featureContainer) {
        featureContainer.style.display = "none";
    }
    const featureCarousel = document.getElementById("featureCarousel");
    if (featureCarousel) {
        featureCarousel.innerHTML = "";
    }

    // Clear surrogate parameters container
    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }

    // Hide visualization container and reset visualizations
    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    // Clear visualization containers with null checks
    const scatterPlot = document.getElementById("scatter-plot");
    if (scatterPlot) {
        scatterPlot.innerHTML = "";
    }
    
    const blocksTreePlot = document.getElementById("blocks-tree-plot");
    if (blocksTreePlot) {
        blocksTreePlot.innerHTML = "";
    }
    
    const classicTreePlot = document.getElementById("classic-tree-plot");
    if (classicTreePlot) {
        classicTreePlot.innerHTML = "";
    }
    
    const treespawnTreePlot = document.getElementById("treespawn-tree-plot");
    if (treespawnTreePlot) {
        treespawnTreePlot.innerHTML = "";
    }

    // Reset state values
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;

    // Reset the global color map
    setGlobalColorMap(null);
    
    // Reset visualization state tracking
    resetVisualizationState();
};

export const resetUISelectClassifier = (appState) => {
    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    if (featureContainer) {
        featureContainer.style.display = "none";
    }
    const featureCarousel = document.getElementById("featureCarousel");
    if (featureCarousel) {
        featureCarousel.innerHTML = "";
    }

    // Clear surrogate parameters container
    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }

    // Hide visualization container and reset visualizations
    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    // Clear visualization containers with null checks
    const scatterPlot = document.getElementById("scatter-plot");
    if (scatterPlot) {
        scatterPlot.innerHTML = "";
    }
    
    const blocksTreePlot = document.getElementById("blocks-tree-plot");
    if (blocksTreePlot) {
        blocksTreePlot.innerHTML = "";
    }
    
    const classicTreePlot = document.getElementById("classic-tree-plot");
    if (classicTreePlot) {
        classicTreePlot.innerHTML = "";
    }
    
    const treespawnTreePlot = document.getElementById("treespawn-tree-plot");
    if (treespawnTreePlot) {
        treespawnTreePlot.innerHTML = "";
    }

    // Reset feature descriptor in the state
    appState.featureDescriptor = null;
    
    // Reset visualization state tracking
    resetVisualizationState();
};

export const resetUIstartTraining = () => {
    // Clear surrogate parameters container and visualization container
    const surrogateContainer = document.getElementById("surrogateContainer");
    if (surrogateContainer) {
        surrogateContainer.innerHTML = "";
    }
    
    const svgContainer = document.querySelector(".svg-container");
    if (svgContainer) {
        svgContainer.style.display = "none";
    }
    
    // Clear visualization containers with null checks
    const scatterPlot = document.getElementById("scatter-plot");
    if (scatterPlot) {
        scatterPlot.innerHTML = "";
    }
    
    const blocksTreePlot = document.getElementById("blocks-tree-plot");
    if (blocksTreePlot) {
        blocksTreePlot.innerHTML = "";
    }
    
    const classicTreePlot = document.getElementById("classic-tree-plot");
    if (classicTreePlot) {
        classicTreePlot.innerHTML = "";
    }
    
    const treespawnTreePlot = document.getElementById("treespawn-tree-plot");
    if (treespawnTreePlot) {
        treespawnTreePlot.innerHTML = "";
    }
    
    // Reset visualization state tracking
    resetVisualizationState();
};