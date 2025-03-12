import { setupScatterPlotMethodListeners } from "../visualizations.js";

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

export function buildExplanationRequestData(
    instanceData,
    surrogateParams,
    appState
) {
    // Get the currently selected scatter plot method
    const methodElement = document.querySelector(
        'input[name="scatterPlotMethod"]:checked'
    );

    // Default to "umap" if no method is selected
    const scatterPlotMethod = methodElement ? methodElement.value : "umap";

    return {
        instance: instanceData,
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: scatterPlotMethod,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
    };
}

export const updateVisualizationUI = () => {
    const svgContainer = document.querySelector(".svg-container");

    svgContainer.style.display = "block";

    svgContainer.innerHTML = `
    <div class="svg-side-by-side">
      <div class="visualization-container">
        <div class="visualization-header">
          <h2>Neighborhood scatter plot</h2>
          <div class="scatter-plot-controls">
            <label>
              <input type="radio" name="scatterPlotMethod" value="umap" checked />
              <span>UMAP</span>
            </label>
            <label>
              <input type="radio" name="scatterPlotMethod" value="pca" />
              <span>PCA</span>
            </label>
            <label>
              <input type="radio" name="scatterPlotMethod" value="tsne" />
              <span>t-SNE</span>
            </label>
            <label>
              <input type="radio" name="scatterPlotMethod" value="mds" />
              <span>MDS</span>
            </label>
          </div>
        </div>
        <div id="scatter-plot"></div>
        <p id="x-axis-label"></p>
        <p id="y-axis-label"></p>
      </div>
      <div class="visualization-container">
        <div class="visualization-header">
          <h2>Surrogate Model</h2>
          <div></div> <!-- Empty div to maintain consistent layout -->
        </div>
        <div id="tree-plot"></div>
      </div>
    </div>
  `;

    setupScatterPlotMethodListeners();
};
