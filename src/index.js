// index.js
import {
    fetchTreeData,
} from './jsHelpers/DecisionTree.js';
import {
    initializeScatterPlot,
} from './jsHelpers/PCA.js';
import {
    toggleDataset,
} from './jsHelpers/datasetShow.js';

window.toggleDataset = toggleDataset;

// Fetch features when page loads
window.onload = async function () {
    try {
        const features = await fetchFeatures();
        populateFeatureCarousel(features);
    } catch (error) {
        console.error("Failed to load features. Please try refreshing the page.");
    }
};

// Function to handle dataset selection
window.selectDataset = function (datasetName) {
    console.log(`Selected dataset: ${datasetName}`);
    // Show the header and feature button container
    document.getElementById("header").style.display = "block";
    document.getElementById("featureButtonContainer").style.display = "block";
    document.getElementById("svg-container").style.display = "block";
};

async function fetchFeatures() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8000/api/get-df-features"
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching features:", error);
        throw error;
    }
}

function populateFeatureCarousel(features) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = "";
    features.forEach((feature) => {
        const box = document.createElement("div");
        box.className = "feature-box";
        box.innerHTML = `
            <div>${feature}</div>
            <input type="text" id="${feature}" placeholder="Enter value">
        `;
        carousel.appendChild(box);
    });
}

// Function to initialize both visualizations
async function initializeVisualizations() {
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

document.addEventListener("DOMContentLoaded", initializeVisualizations);
