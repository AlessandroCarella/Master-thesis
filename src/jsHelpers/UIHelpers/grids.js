export function populateDatasetGrid(data) {
    const grid = document.getElementById("datasetGrid");
    grid.innerHTML = "";

    data.datasets.forEach((dataset) => {
        const card = document.createElement("div");
        card.className = "carousel-card";
        card.innerHTML = `<h3>${dataset}</h3>`;
        card.onclick = () => selectDataset(dataset); // Set onclick on the entire card
        grid.appendChild(card);
    });
}

export function populateClassifierGrid(data) {
    const grid = document.getElementById("classifierGrid");
    grid.innerHTML = "";

    Object.keys(data.classifiers).forEach((classifier) => {
        const card = document.createElement("div");
        card.className = "carousel-card";
        card.innerHTML = `<h3>${classifier}</h3>`;
        card.onclick = () => selectClassifier(classifier); // Set onclick on the entire card
        grid.appendChild(card);
    });
}

export function populateParameterForm(parameters) {
    const form = document.getElementById("parameterForm");
    form.className = "parameter-form";
    form.innerHTML = "";

    Object.entries(parameters).forEach(([param, defaultValue]) => {
        const input = document.createElement("div");
        input.className = "parameter-input"; // Changed from 'parameter-input' to match our CSS
        input.innerHTML = `
            <label for="${param}">${param}:</label>
            <input type="text" id="${param}" value="${defaultValue}" 
                   onchange="updateParameter('${param}', this.value)">
        `;
        form.appendChild(input);
    });
}
