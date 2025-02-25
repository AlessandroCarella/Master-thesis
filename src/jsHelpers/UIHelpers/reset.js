import { setGlobalColorMap } from "../visualizationConnector.js";

export const resetUIDatasetSelection = (appState) => {
    // Hide classifier section
    document.getElementById("classifierSection").style.display = "none";

    // Hide and reset parameter section
    const parameterSection = document.getElementById("parameterSection");
    parameterSection.style.display = "none";
    document.getElementById("parameterForm").innerHTML = "";

    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    featureContainer.style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Clear surrogate parameters container
    document.getElementById("surrogateContainer").innerHTML = "";

    // Hide visualization container and reset visualizations
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset state values
    appState.selectedClassifier = null;
    appState.parameters = {};
    appState.featureDescriptor = null;

    // Reset the global color map
    setGlobalColorMap(null);
};

export const resetUISelectClassifier = (appState) => {
    // Hide and reset feature inputs
    const featureContainer = document.getElementById("featureButtonContainer");
    featureContainer.style.display = "none";
    document.getElementById("featureCarousel").innerHTML = "";

    // Clear surrogate parameters container
    document.getElementById("surrogateContainer").innerHTML = "";

    // Hide visualization container and reset visualizations
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";

    // Reset feature descriptor in the state
    appState.featureDescriptor = null;
};

export const resetUIstartTraining = () => {
    // Clear surrogate parameters container and visualization container
    document.getElementById("surrogateContainer").innerHTML = "";
    document.querySelector(".svg-container").style.display = "none";
    document.getElementById("pca-plot").innerHTML = "";
    document.getElementById("visualization").innerHTML = "";
};
