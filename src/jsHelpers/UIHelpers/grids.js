import { createSection, createSurrogateInput, createVisualizationToggle } from "./inputs.js";

export function populateDatasetGrid(data) {
    const container = document.getElementById("datasetGrid");
    container.className = "carousel-container";
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "carousel-grid";

    Object.keys(data.datasets).forEach((dataset) => {
        const card = document.createElement("div");
        card.className = "carousel-card";
        card.innerHTML = `<h3>${dataset}</h3>`;
        card.onclick = () => {
            // Remove selected class from all cards
            grid.querySelectorAll(".carousel-card").forEach((card) => {
                card.classList.remove("selected");
            });
            // Add selected class to clicked card
            card.classList.add("selected");
            selectDataset(dataset);
        };
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

export function populateClassifierGrid(data) {
    const container = document.getElementById("classifierGrid");
    container.className = "carousel-container";
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "carousel-grid";

    Object.keys(data.classifiers).forEach((classifier) => {
        const card = document.createElement("div");
        card.className = "carousel-card";
        card.innerHTML = `<h3>${classifier}</h3>`;
        card.onclick = () => {
            // Remove selected class from all cards
            grid.querySelectorAll(".carousel-card").forEach((card) => {
                card.classList.remove("selected");
            });
            // Add selected class to clicked card
            card.classList.add("selected");
            selectClassifier(classifier);
        };
        grid.appendChild(card);
    });

    container.appendChild(grid);
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

export function populateSurrogateForm(container) {
    const surrogateParameters = {
        neighbourhood_size: {
            label: "Neighbourhood Size",
            min: 15,
            max: 10000,
            default: 500,
            step: 10,
        },
        scatterPlotStep: {
            label: "Scatter plot Step Size",
            min: 0.001,
            max: 1,
            default: 0.1,
            step: 0.01,
        },
        includeOriginalDataset: {
            label: "Include original dataset in scatter plot",
            type: "select",
            options: ["Yes", "No"],
            default: "No",
        },
    };

    const visualizationToggles = {
        scatterPlot: {
            label: "2D Scatter Plot",
            default: true,
        },
        blocksTree: {
            label: "Blocks Decision Tree",
            default: true,
        },
        classicTree: {
            label: "Classic Decision Tree",
            default: false,
        },
        treeSpawn: {
            label: "TreeSpawn Decision Tree",
            default: false,
        },
    };

    const section = createSection(
        "Surrogate Model Parameters",
        "surrogate-parameters"
    );
    container.appendChild(section);

    Object.entries(surrogateParameters).forEach(([param, details]) => {
        createSurrogateInput(section, param, details);
    });

    // Add visualization toggles section
    const visualizationSection = createSection(
        "Visualization Selection",
        "visualization-toggles"
    );
    container.appendChild(visualizationSection);

    // Add instruction text
    const instructionText = document.createElement("p");
    instructionText.className = "visualization-instruction";
    instructionText.textContent = "Select which visualizations to display (at least one must be selected):";
    visualizationSection.querySelector(".feature-section-content").appendChild(instructionText);

    Object.entries(visualizationToggles).forEach(([param, details]) => {
        createVisualizationToggle(visualizationSection, param, details);
    });
}