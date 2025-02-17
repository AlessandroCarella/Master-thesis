export function populateDatasetGrid(data) {
    const grid = document.getElementById("datasetGrid");
    grid.innerHTML = "";

    data.datasets.forEach((dataset) => {
        const card = document.createElement("div");
        card.className = "dataset-card";
        card.innerHTML = `
            <h3>${dataset}</h3>
            <button onclick="selectDataset('${dataset}')">Select</button>
        `;
        grid.appendChild(card);
    });
}

export function populateClassifierGrid(data) {
    const grid = document.getElementById("classifierGrid");
    grid.innerHTML = "";

    Object.keys(data.classifiers).forEach((classifier) => {
        const card = document.createElement("div");
        card.className = "classifier-card";
        card.innerHTML = `
            <h3>${classifier}</h3>
            <button onclick="selectClassifier('${classifier}')">Select</button>
        `;
        grid.appendChild(card);
    });
}

export function populateParameterForm(parameters) {
    const form = document.getElementById("parameterForm");
    form.innerHTML = "";

    Object.entries(parameters).forEach(([param, defaultValue]) => {
        const input = document.createElement("div");
        input.className = "parameter-input";
        input.innerHTML = `
            <label for="${param}">${param}:</label>
            <input type="text" id="${param}" value="${defaultValue}" 
                   onchange="updateParameter('${param}', this.value)">
        `;
        form.appendChild(input);
    });
}