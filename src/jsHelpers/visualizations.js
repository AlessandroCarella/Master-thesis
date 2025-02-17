import { createVisualization } from './DecisionTree.js';
import { createPCAscatterPlot } from './PCA.js';

export function initializeVisualizations(data) {
    if (!data) {
        console.log("No visualization data provided");
        return;
    }

    // Clear existing visualizations
    d3.select("#pca-plot").selectAll("*").remove();
    d3.select("#visualization").selectAll("*").remove();

    if (data.PCAvisualizationData) {
        createPCAscatterPlot(data.PCAvisualizationData, "#pca-plot");
    }

    if (data.decisionTreeVisualizationData) {
        createVisualization(data.decisionTreeVisualizationData);
    }
}