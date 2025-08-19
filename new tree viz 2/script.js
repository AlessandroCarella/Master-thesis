import { createTreeVisualization } from "./jsModules/DecisionTree.js";

let currentTreeNumber = 1;
let loadedData = {}; // Cache loaded data

// Function to update button states
function updateButtonStates(activeTreeNumber) {
    const buttons = document.querySelectorAll('.tree-button');
    buttons.forEach(button => {
        const treeNumber = parseInt(button.dataset.tree);
        if (treeNumber === activeTreeNumber) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Function to show error message
function showError(message) {
    const treePlot = document.getElementById('tree-plot');
    treePlot.innerHTML = `
        <div class="error-message">
            <h3>Error Loading Data</h3>
            <p>${message}</p>
            <p>Please make sure the data files are in the correct location:</p>
            <ul>
                <li>data/tree.json & data/instance.json</li>
                <li>data/tree2.json & data/instance2.json</li>
                <li>data/tree3.json & data/instance3.json</li>
            </ul>
        </div>
    `;
}

// Function to load tree data for a specific tree number
async function loadTreeData(treeNumber = 1) {
    try {        
        // Check if data is already cached
        const cacheKey = `tree${treeNumber}`;
        if (loadedData[cacheKey]) {
            createTreeVisualization(loadedData[cacheKey].treeData, loadedData[cacheKey].instanceData);
            return;
        }

        // Determine file names based on tree number
        const treeFileName = treeNumber === 1 ? 'tree.json' : `tree${treeNumber}.json`;
        const instanceFileName = treeNumber === 1 ? 'instance.json' : `instance${treeNumber}.json`;
        
        // Load tree data
        const treeResponse = await fetch(`./data/${treeFileName}`);
        if (!treeResponse.ok) {
            throw new Error(`Failed to load ${treeFileName}: ${treeResponse.status}`);
        }
        const treeData = await treeResponse.json();
        
        // Load instance data
        const instanceResponse = await fetch(`./data/${instanceFileName}`);
        if (!instanceResponse.ok) {
            throw new Error(`Failed to load ${instanceFileName}: ${instanceResponse.status}`);
        }
        const instanceData = await instanceResponse.json();
        
        // Cache the loaded data
        loadedData[cacheKey] = {
            treeData: treeData,
            instanceData: instanceData
        };
        
        // Create visualization with both tree and instance data
        createTreeVisualization(treeData, instanceData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.message);
    }
}

// Function to switch to a different tree
function switchToTree(treeNumber) {
    if (treeNumber === currentTreeNumber) {
        return; // Already showing this tree
    }
    
    currentTreeNumber = treeNumber;
    updateButtonStates(treeNumber);
    loadTreeData(treeNumber);
}

// Initialize button event listeners
function initializeButtons() {
    const buttons = document.querySelectorAll('.tree-button');
    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            const treeNumber = parseInt(event.target.dataset.tree);
            switchToTree(treeNumber);
        });
    });
}

initializeButtons();
updateButtonStates(currentTreeNumber);
loadTreeData(currentTreeNumber);