import { fetchJSON, API_BASE } from "../API.js";

export const closeDatasetPanelIfVisible = () => {
  const datasetPanel = document.getElementById("datasetPanel");
  if (datasetPanel.classList.contains("visible")) {
    datasetPanel.classList.remove("visible");
  }
};

export const showDatasetLoading = () => {
  const datasetInfoDiv = document.getElementById("datasetInfo");
  datasetInfoDiv.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading dataset information...</span>
    </div>
  `;
  datasetInfoDiv.style.display = "block";
};

export const updateDatasetInfoPanel = (datasetName, datasetInfo) => {
  const datasetInfoDiv = document.getElementById("datasetInfo");
  datasetInfoDiv.innerHTML = `
    <h3>Dataset: ${datasetName}</h3>
    <p>Samples: ${datasetInfo.n_samples}</p>
    <p>Features: ${
      Array.isArray(datasetInfo.feature_names)
        ? JSON.parse(JSON.stringify(datasetInfo.feature_names)).join(", ")
        : datasetInfo.feature_names
    }</p>
    <p>Target: ${JSON.parse(JSON.stringify(datasetInfo.target_names)).join(
      ", "
    )}</p>
    <button id="showDatasetBtn" class="show-dataset-btn btn">Show Dataset</button>
  `;
  datasetInfoDiv.style.display = "block";
};

export const handleDatasetInfoError = (datasetName, error) => {
  console.error("Error fetching dataset info:", error);
  const datasetInfoDiv = document.getElementById("datasetInfo");
  datasetInfoDiv.innerHTML = `
    <h3>Error loading dataset: ${datasetName}</h3>
    <p>Failed to load dataset information. Please try again.</p>
  `;
  datasetInfoDiv.style.display = "block";
};

export const createTableFromData = (data) => {
  if (!data || !data.length) return "<p>No data available.</p>";
  const keys = Object.keys(data[0]);
  let html = "<table><thead><tr>";
  keys.forEach((key) => {
    html += `<th>${key}</th>`;
  });
  html += "</tr></thead><tbody>";
  data.forEach((record) => {
    html += "<tr>";
    keys.forEach((key) => {
      html += `<td>${record[key]}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
};

export const attachDatasetPanelEventListeners = () => {
  const showDatasetBtn = document.getElementById("showDatasetBtn");
  if (showDatasetBtn) {
    showDatasetBtn.addEventListener("click", async () => {
      try {
        const datasetName = window.appState.dataset_name || "Dataset";
        const titleElement = document.getElementById("datasetPanelTitle");
        titleElement.textContent = `The ${datasetName} dataset`;

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
  }

  const closeDatasetPanel = document.getElementById("closeDatasetPanel");
  if (closeDatasetPanel) {
    closeDatasetPanel.addEventListener("click", () => {
      document.getElementById("datasetPanel").classList.remove("visible");
    });
  }
};
