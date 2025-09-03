// Simplified API.js - No feature mapping complexity
export const API_BASE = "http://127.0.0.1:8000/api";

export const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

export const fetchDatasets = () => fetchJSON(`${API_BASE}/get-datasets`);

export const fetchClassifiers = () => fetchJSON(`${API_BASE}/get-classifiers`);

export const fetchDatasetInfo = async (datasetName) => {
    const infoResponse = await fetch(
        `${API_BASE}/get-dataset-info/${datasetName}`
    );
    return await infoResponse.json();
};

export const fetchClassifierParameters = async () =>
    fetchJSON(`${API_BASE}/get-classifiers`);

export const trainModel = async (trainingData) =>
    fetchJSON(`${API_BASE}/train-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingData),
    });

export const fetchExplanation = async (requestData) => {
    const response = await fetchJSON(`${API_BASE}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
    });
    
    return response;
};

export const fetchClassColors = (method = 'umap') =>
    fetchJSON(`${API_BASE}/get-classes-colors?method=${method}`);

export async function fetchVisualizationUpdate(requestData) {
    try {
        const response = await fetch(`${API_BASE}/update-visualization`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.error || "Failed to update visualization"
            );
        }

        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error("Error updating visualization:", error);
        throw error;
    }
}
