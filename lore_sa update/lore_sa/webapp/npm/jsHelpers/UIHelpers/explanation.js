/**
 * @fileoverview Explanation generation utilities for building request data and managing visualization UI
 * @module explanation
 * @author Generated documentation
 */

import { setupScatterPlotMethodListeners } from "../visualizations.js";
import { getVisualizationSettings, getAllDimensionalityReductionParameters } from "./featureManagement.js";

/**
 * Shows loading state while explanation is being generated
 * @description Displays a loading spinner in the SVG container during explanation processing
 * @returns {void}
 * @example
 * showExplanationLoading();
 */
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

/**
 * Builds request data object for instance-based explanation generation
 * @description Creates a complete request payload including instance data, dataset info, and visualization parameters
 * @param {Object} instanceData - The data instance to explain
 * @param {Object} surrogateParams - Parameters for surrogate model generation
 * @param {number} surrogateParams.neighbourhood_size - Size of the neighborhood to generate
 * @param {number} surrogateParams.scatterPlotStep - Step size for scatter plot decision boundaries
 * @param {boolean} surrogateParams.includeOriginalDataset - Whether to include original dataset points
 * @param {boolean} surrogateParams.keepDuplicates - Whether to keep duplicate points in neighborhood
 * @param {Object} appState - Current application state
 * @param {string} appState.dataset_name - Name of the currently selected dataset
 * @returns {Object} Complete request data object for explanation API
 * @example
 * const requestData = buildExplanationRequestData(
 *   { feature1: 1.5, feature2: 2.0 },
 *   { neighbourhood_size: 500, scatterPlotStep: 0.1, includeOriginalDataset: false, keepDuplicates: false },
 *   { dataset_name: "iris" }
 * );
 */
export function buildExplanationRequestData(
    instanceData,
    surrogateParams,
    appState
) {
    const methodElement = document.querySelector(
        'input[name="scatterPlotMethod"]:checked'
    );

    const scatterPlotMethod = methodElement ? methodElement.value : "umap";
    const allMethodParams = getAllDimensionalityReductionParameters();

    return {
        instance: instanceData,
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: scatterPlotMethod,
        dimensionalityReductionMethod: scatterPlotMethod,
        dimensionalityReductionParameters: allMethodParams[scatterPlotMethod.toUpperCase()] || {},
        allMethodParameters: allMethodParams,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
        keepDuplicates: surrogateParams.keepDuplicates,
    };
}

/**
 * Builds request data object for provided instance explanation generation
 * @description Creates request payload for explanations using predefined instances (no custom instance data)
 * @param {Object} surrogateParams - Parameters for surrogate model generation
 * @param {number} surrogateParams.neighbourhood_size - Size of the neighborhood to generate
 * @param {number} surrogateParams.scatterPlotStep - Step size for scatter plot decision boundaries
 * @param {boolean} surrogateParams.includeOriginalDataset - Whether to include original dataset points
 * @param {boolean} surrogateParams.keepDuplicates - Whether to keep duplicate points in neighborhood
 * @param {Object} appState - Current application state
 * @param {string} appState.dataset_name - Name of the currently selected dataset
 * @returns {Object} Request data object for provided instance explanation API
 * @example
 * const requestData = buildProvidedInstanceRequestData(
 *   { neighbourhood_size: 500, scatterPlotStep: 0.1, includeOriginalDataset: true, keepDuplicates: false },
 *   { dataset_name: "wine" }
 * );
 */
export function buildProvidedInstanceRequestData(
    surrogateParams,
    appState
) {
    const methodElement = document.querySelector(
        'input[name="scatterPlotMethod"]:checked'
    );

    const scatterPlotMethod = methodElement ? methodElement.value : "umap";
    const allMethodParams = getAllDimensionalityReductionParameters();

    return {
        dataset_name: appState.dataset_name,
        neighbourhood_size: surrogateParams.neighbourhood_size,
        scatterPlotStep: surrogateParams.scatterPlotStep,
        scatterPlotMethod: scatterPlotMethod,
        dimensionalityReductionMethod: scatterPlotMethod,
        dimensionalityReductionParameters: allMethodParams[scatterPlotMethod.toUpperCase()] || {},
        allMethodParameters: allMethodParams,
        includeOriginalDataset: surrogateParams.includeOriginalDataset,
        keepDuplicates: surrogateParams.keepDuplicates,
    };
}

/**
 * Updates the visualization UI based on selected visualization settings
 * @description Dynamically creates HTML layout for selected visualizations and sets up event listeners
 * @returns {void}
 * @example
 * updateVisualizationUI();
 * @see {@link getVisualizationSettings} for getting current visualization selections
 */
export const updateVisualizationUI = () => {
    const svgContainer = document.querySelector(".svg-container");
    const vizSettings = getVisualizationSettings();
    
    svgContainer.style.display = "block";
    
    const selectedVisualizations = [];
    
    if (vizSettings.scatterPlot) {
        selectedVisualizations.push({
            id: 'scatter-plot',
            html: `
              <div class="visualization-container">
                <div class="visualization-header">
                  <h2>Neighborhood 2D projection</h2>
                  <div class="scatter-plot-controls">
                    <label>
                      <input type="radio" name="scatterPlotMethod" value="umap" checked />
                      <span>UMAP</span>
                    </label>
                    <label>
                    <!-- 
                    <input type="radio" name="scatterPlotMethod" value="pacmap" />
                    <span>PaCMAP</span>
                    -->
                    </label>
                    <label>
                    <input type="radio" name="scatterPlotMethod" value="tsne" />
                    <span>t-SNE</span>
                    </label>
                    <label>
                    <input type="radio" name="scatterPlotMethod" value="pca" />
                    <span>PCA</span>
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
                  <h2>Rule and Counterfactual Rules Centered surrogate model</h2>
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
                  <h2>Tree Layout surrogate model</h2>
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
                  <h2>Rule Centered surrogate model</h2>
                  <div></div> <!-- Empty div to maintain consistent layout -->
                </div>
                <div id="treespawn-tree-plot"></div>
              </div>
            `
        });
    }
    
    let htmlContent = '';
    
    if (selectedVisualizations.length === 1) {
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 2) {
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += selectedVisualizations[1].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 3) {
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[0].html;
        htmlContent += selectedVisualizations[1].html;
        htmlContent += '</div>';
        htmlContent += '<div class="svg-side-by-side">';
        htmlContent += selectedVisualizations[2].html;
        htmlContent += '</div>';
    } else if (selectedVisualizations.length === 4) {
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

    if (vizSettings.scatterPlot) {
        setupScatterPlotMethodListeners();
    }
};
