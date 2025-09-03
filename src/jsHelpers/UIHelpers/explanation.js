import { setupScatterPlotMethodListeners } from "../visualizations.js";
import { getVisualizationSettings } from "./featureManagement.js";

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
    const vizSettings = getVisualizationSettings();
    
    svgContainer.style.display = "block";
    
    // Create array of selected visualizations with their HTML
    const selectedVisualizations = [];
    
    if (vizSettings.scatterPlot) {
        selectedVisualizations.push({
            id: 'scatter-plot',
            html: `
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
              </div>
            `
        });
    }
        
    if (vizSettings.blocksTree) {
        selectedVisualizations.push({
            id: 'blocks-tree-plot',
            html: `
              <div class="visualization-container">
                <div class="visualization-header">
                  <h2>Blocks Decision Tree</h2>
                  <div></div> <!-- Empty div to maintain consistent layout -->
                </div>
                <div id="blocks-tree-plot"></div>
              </div>
            `
        });
    }
    
    if (vizSettings.classicTree) {
        selectedVisualizations.push({
            id: 'classic-tree-plot',
            html: `
              <div class="visualization-container">
                <div class="visualization-header">
                  <h2>Surrogate Model</h2>
                  <div></div> <!-- Empty div to maintain consistent layout -->
                </div>
                <div id="classic-tree-plot"></div>
              </div>
            `
        });
    }
    
    if (vizSettings.treeSpawn) {
        selectedVisualizations.push({
            id: 'treespawn-tree-plot',
            html: `
              <div class="visualization-container">
                <div class="visualization-header">
                  <h2>TreeSpawn Decision Tree</h2>
                  <div></div> <!-- Empty div to maintain consistent layout -->
                </div>
                <div id="treespawn-tree-plot"></div>
              </div>
            `
        });
    }
    
    // Build HTML based on number of selected visualizations
    let htmlContent = '';
    
    if (selectedVisualizations.length === 1) {
        // Single visualization - center it
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 2) {
        // Two visualizations - put them side by side
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += selectedVisualizations[1].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 3) {
        // Three visualizations - first two on top row, third on bottom
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += selectedVisualizations[1].html;
        htmlContent += '</div>';
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[2].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 4) {
        // Four visualizations - two rows of two
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += selectedVisualizations[1].html;
        htmlContent += '</div>';
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[2].html;
        htmlContent += selectedVisualizations[3].html;
        htmlContent += '</div>';
    }

    svgContainer.innerHTML = htmlContent;

    // Only setup scatter plot listeners if scatter plot is enabled
    if (vizSettings.scatterPlot) {
        setupScatterPlotMethodListeners();
    }
};
