import { fetchJSON, API_BASE } from "../API.js";

export const closeDatasetPanelIfVisible = () => {
    const datasetPanel = document.getElementById("datasetPanel");
    if (datasetPanel.classList.contains("visible")) {
        datasetPanel.classList.remove("visible");
    }
};

export const showDatasetLoading = () => {
    updateDatasetInfoContent(`
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <span class="loading-text">Loading dataset information...</span>
        </div>
    `);
};

const updateDatasetInfoContent = (htmlContent) => {
    const datasetInfoDiv = document.getElementById("datasetInfo");
    datasetInfoDiv.innerHTML = htmlContent;
    datasetInfoDiv.style.display = "block";
};

export const updateDatasetInfoPanel = (datasetName, datasetInfo) => {
    const featureNames = formatFeatureNames(datasetInfo.feature_names);
    const targetNames = formatFeatureNames(datasetInfo.target_names);

    updateDatasetInfoContent(`
        <h3>Dataset: ${datasetName}</h3>
        <p>Samples: ${datasetInfo.n_samples}</p>
        <p>Features: ${featureNames}</p>
        <p>Target: ${targetNames}</p>
        <button id="showDatasetBtn" class="show-dataset-btn btn">Show Dataset</button>
    `);
};

const formatFeatureNames = (names) => {
    return Array.isArray(names) ? names.join(", ") : names;
};

export const handleDatasetInfoError = (datasetName) => {
    updateDatasetInfoContent(`
        <h3>Error loading dataset: ${datasetName}</h3>
        <p>Failed to load dataset information. Please try again.</p>
    `);
};

export const createTableFromData = (data) => {
    if (!data || !data.length) return "<p>No data available.</p>";
    const keys = Object.keys(data[0]);

    const headerRow = keys.map((key) => `<th>${key}</th>`).join("");
    const rows = data
        .map((record) => {
            return `<tr>${keys
                .map((key) => `<td>${record[key]}</td>`)
                .join("")}</tr>`;
        })
        .join("");

    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
};

export const attachDatasetPanelEventListeners = () => {
    attachShowDatasetButtonListener();
    attachCloseDatasetPanelListener();
};

const attachShowDatasetButtonListener = () => {
    const showDatasetBtn = document.getElementById("showDatasetBtn");
    if (!showDatasetBtn) return;

    showDatasetBtn.addEventListener("click", async () => {
        try {
            const datasetName = window.appState.dataset_name || "Dataset";
            document.getElementById(
                "datasetPanelTitle"
            ).textContent = `The ${datasetName} dataset`;

            const result = await fetchJSON(`${API_BASE}/get-selected-dataset`);
            if (result.error) {
                alert(result.error);
                return;
            }

            document.getElementById("datasetPanelContent").innerHTML =
                createTableFromData(result.dataset);

            document.getElementById("datasetPanel").classList.add("visible");
        } catch (error) {
            console.error("Error fetching dataset:", error);
        }
    });
};

const attachCloseDatasetPanelListener = () => {
    const closeDatasetPanel = document.getElementById("closeDatasetPanel");
    if (closeDatasetPanel) {
        closeDatasetPanel.addEventListener("click", closeDatasetPanelIfVisible);
    }
};
