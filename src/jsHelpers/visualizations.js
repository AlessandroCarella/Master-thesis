// Update visualizations.js
import { createVisualization } from "./DecisionTree.js";
import { createPCAscatterPlot } from "./PCA.js";

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    // Clear existing visualizations
    d3.select("#pca-plot").selectAll("*").remove();
    d3.select("#visualization").selectAll("*").remove();

    // Create Decision Tree first
    if (data.decisionTreeVisualizationData) {
        createVisualization(data.decisionTreeVisualizationData);
    }

    // Then create PCA plot with reference to tree visualization
    if (data.PCAvisualizationData) {
        const treeVis = window.treeVisualization; // Get the tree visualization reference
        createPCAscatterPlot(data.PCAvisualizationData, "#pca-plot", treeVis);
    }
}
