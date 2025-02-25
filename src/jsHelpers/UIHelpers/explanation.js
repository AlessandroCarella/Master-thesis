export const showExplanationLoading = () => {
    const svgContainer = document.querySelector(".svg-container");
    svgContainer.style.display = "block";
    svgContainer.innerHTML = `
      <div class="loading-container full-width">
        <div class="loading-spinner"></div>
        <span class="loading-text">Generating explanation, please wait...</span>
      </div>
    `;
};

export const determineDatasetType = (appState) => {
    return appState.datasetType || "tabular";
};

export const buildExplanationRequestData = (
    instanceData,
    surrogateParams,
    datasetType,
    appState
) => {
    const requestData = {
        instance: instanceData,
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        PCAstep: surrogateParams.PCAstep,
    };

    if (datasetType === "image" && instanceData.image) {
        requestData.instance_type = "image";
        requestData.image = instanceData.image;
        requestData.imageWidth = instanceData.imageWidth;
        requestData.imageHeight = instanceData.imageHeight;
    }
    return requestData;
};

export const updateVisualizationUI = () => {
    const svgContainer = document.querySelector(".svg-container");
    svgContainer.innerHTML = `
      <div class="svg-side-by-side">
        <div class="visualization-container">
          <h2>Neighborhood PCA</h2>
          <div id="pca-plot"></div>
          <p id="x-axis-label"></p>
          <p id="y-axis-label"></p>
        </div>
        <div class="visualization-container">
          <h2>Surrogate Model</h2>
          <div id="visualization"></div>
        </div>
      </div>
    `;
};
