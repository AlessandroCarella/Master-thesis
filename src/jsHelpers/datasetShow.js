export {
    toggleDataset
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

async function toggleDataset() {
    const panel = document.getElementById("datasetPanel");
    const container = document.querySelector(".container");
    panel.classList.toggle("visible");
    container.classList.toggle("shifted");

    if (panel.classList.contains("visible")) {
        const data = await fetchDataset();
        // Assuming the API returns an object with a 'dataset' property
        displayDataset(data.dataset);
    }
}
