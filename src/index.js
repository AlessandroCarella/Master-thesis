// index.js
import {
    fetchTreeData,
} from './jsHelpers/DecisionTree.js';
import {
    initializeScatterPlot,
} from './jsHelpers/PCA.js';

// Fetch features when page loads
window.onload = async function () {
    try {
        const features = await fetchFeatures();
        populateFeatureCarousel(features);
        await fetchDataset(); // Fetch initial dataset
    } catch (error) {
        showError("Failed to load features. Please try refreshing the page.");
    }
};

function showError(message) {
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = message;
}

async function fetchFeatures() {
    try {
        const response = await fetch(
            "http://127.0.0.1:8000/api/get-df-features"
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.features;
    } catch (error) {
        console.error("Error fetching features:", error);
        throw error;
    }
}

async function resetFeatures() {
    const defaultFeatures = await fetchDefaultFeatures();
    populateFeatureCarousel(defaultFeatures);
}

async function fetchDefaultFeatures() {
    return ["Default Feature 1", "Default Feature 2", "Default Feature 3"];
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

async function submitFeatures() {
    const features = {};
    document.querySelectorAll(".feature-box input").forEach((input) => {
        features[input.id] = input.value;
    });

    try {
        const response = await fetch("/api/make-explanation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(features),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Explanation:", data);
    } catch (error) {
        console.error("Error getting explanation:", error);
        showError("Failed to get explanation. Please try again.");
    }
}

// Dataset Panel Functions
window.toggleDataset = async function() {
    const panel = document.getElementById("datasetPanel");
    const container = document.querySelector(".container");
    panel.classList.toggle("visible");
    container.classList.toggle("shifted");

    if (panel.classList.contains("visible")) {
        const dataset = await fetchDataset(); // Fetch dataset here
        displayDataset(dataset.dataset); // Pass dataset to displayDataset
    }
};

async function fetchDataset() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/get-dataset");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched dataset:", data);
        return data;
    } catch (error) {
        console.error("Error fetching dataset:", error);
        showError("Failed to load dataset. Please try refreshing the page.");
        return null;
    }
}

async function displayDataset(dataset) {
    const tableDiv = document.getElementById("datasetTable");
    
    if (!dataset || !dataset.length) {
        tableDiv.innerHTML = "<p>No data available</p>";
        return;
    }

    const headers = Object.keys(dataset[0]);
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    ${headers.map((header) => `<th>${header}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${dataset
                    .map(
                        (row) => `
                    <tr>
                        ${headers
                            .map((header) => `<td>${row[header]}</td>`)
                            .join("")}
                    </tr>
                `
                    )
                    .join("")}
            </tbody>
        </table>
    `;

    tableDiv.innerHTML = tableHTML;
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
