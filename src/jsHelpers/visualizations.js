import { fetchTreeData } from './DecisionTree.js';
import { initializeScatterPlot } from './PCA.js';

export async function initializeVisualizations() {
    try {
        const [treeData, scatterData] = await Promise.all([
            fetchTreeData(),
            initializeScatterPlot("#pca-plot")
        ]);

        return { treeData, scatterData };
    } catch (error) {
        console.error("Error initializing visualizations:", error);
    }
}