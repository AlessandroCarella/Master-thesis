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

export const buildTrainingData = (appState) => {
    return {
        dataset_name: appState.dataset_name,
        classifier: appState.selectedClassifier,
        parameters: appState.parameters,
    };
};

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
