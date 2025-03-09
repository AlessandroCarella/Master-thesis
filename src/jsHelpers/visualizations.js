// Update visualizations.js
import { createVisualization } from "./DecisionTree.js";
import { createScatterPlot } from "./scatterPlot.js";

export function initializeVisualizations(data) {
    if (!data) {
        console.error("No visualization data provided");
        return;
    }

    // Clear existing visualizations
    d3.select("#scatter-plot").selectAll("*").remove();
    d3.select("#visualization").selectAll("*").remove();

    // Create Decision Tree first
    if (data.decisionTreeVisualizationData) {
        createVisualization(data.decisionTreeVisualizationData);
    }

    // Then create scatter plot with reference to tree visualization
    if (data.scatterPlotVisualizationData) {
        const treeVis = window.treeVisualization; // Get the tree visualization reference
        createScatterPlot(data.scatterPlotVisualizationData, "#scatter-plot", treeVis);
    }
}
