import { createSection, createSurrogateInput } from "./inputs.js"; 

function populateDatasetGrid(data) {
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

function populateClassifierGrid(data) {
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

function populateParameterForm(parameters) {
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

function populateSurrogateForm(container) {
    const surrogateParameters = {
        'neighbourhood_size': {
            label: 'Neighbourhood Size',
            min: 10,
            max: 1000,
            default: 100,
            step: 10
        },
        'pca_step': {
            label: 'PCA Step Size',
            min: 0.01,
            max: 1,
            default: 0.1,
            step: 0.01
        }
    };

    const section = createSection("Surrogate Model Parameters", "surrogate-parameters");
    container.appendChild(section);

    Object.entries(surrogateParameters).forEach(([param, details]) => {
        createSurrogateInput(section, param, details);
    });
}

export {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
};