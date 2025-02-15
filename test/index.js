// main.js
import {
    fetchTreeData,
} from './DecisionTree.js';
import {
    initializeScatterPlot,
    createScatterPlot,
    fetchScatterData
} from './PCA.js';

// Function to initialize both visualizations
async function initializeVisualizations() {
    try {
        // Initialize both visualizations in parallel
        const [treeData, scatterData] = await Promise.all([
            fetchTreeData(),
            initializeScatterPlot("#pca-plot")
        ]);

        return { treeData, scatterData };
    } catch (error) {
        console.error("Error initializing visualizations:", error);
    }
}

// Initialize when the document is loaded
document.addEventListener("DOMContentLoaded", initializeVisualizations);