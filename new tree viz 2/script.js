import { createTreeVisualization } from "./jsModules/DecisionTree.js";

async function loadTreeData() {
    try {
        // Load tree data
        const treeResponse = await fetch('./data/tree.json');
        if (!treeResponse.ok) {
            throw new Error(`Failed to load tree.json: ${treeResponse.status}`);
        }
        const treeData = await treeResponse.json();
        
        // Load instance data
        const instanceResponse = await fetch('./data/instance.json');
        if (!instanceResponse.ok) {
            throw new Error(`Failed to load instance.json: ${instanceResponse.status}`);
        }
        const instanceData = await instanceResponse.json();
                
        // Create visualization with both tree and instance data
        createTreeVisualization(treeData, instanceData);
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Fallback: show error message in the tree plot div
        const treePlot = document.getElementById('tree-plot');
        treePlot.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #d32f2f;">
                <h3>Error Loading Data</h3>
                <p>${error.message}</p>
                <p>Please make sure the data files are in the correct location:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>data/tree.json</li>
                    <li>data/instance.json</li>
                </ul>
            </div>
        `;
    }
}

// Load tree when page loads
loadTreeData();