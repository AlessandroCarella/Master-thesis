/**
 * @fileoverview Grid population utilities for datasets, classifiers, parameters, and surrogate model forms
 * @module grids
 * @author Generated documentation
 */

import { createSection, createSurrogateInput, createVisualizationToggle } from "./inputs.js";

/**
 * Populates the dataset grid with available datasets as clickable cards
 * @description Creates a carousel-style grid of dataset cards with selection functionality
 * @param {Object} data - Data object containing dataset information
 * @param {string[]} data.datasets - Array of dataset names to display
 * @returns {void}
 * @example
 * populateDatasetGrid({ datasets: ["iris", "wine", "breast_cancer"] });
 */
export function populateDatasetGrid(data) {
    const container = document.getElementById("datasetGrid");
    container.className = "carousel-container";
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "carousel-grid";

    data.datasets.forEach((dataset) => {
        const card = document.createElement("div");
        card.className = "carousel-card";
        card.innerHTML = `<h3>${dataset}</h3>`;
        card.onclick = () => {
            grid.querySelectorAll(".carousel-card").forEach((card) => {
                card.classList.remove("selected");
            });
            card.classList.add("selected");
            selectDataset(dataset);
        };
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/**
 * Populates the classifier grid with available classifiers as clickable cards
 * @description Creates a carousel-style grid of classifier cards with selection functionality
 * @param {Object} data - Data object containing classifier information
 * @param {Object} data.classifiers - Object mapping classifier names to their configurations
 * @returns {void}
 * @example
 * populateClassifierGrid({ 
 *   classifiers: { 
 *     "RandomForest": { n_estimators: 100 }, 
 *     "SVM": { C: 1.0 } 
 *   } 
 * });
 */
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
            grid.querySelectorAll(".carousel-card").forEach((card) => {
                card.classList.remove("selected");
            });
            card.classList.add("selected");
            selectClassifier(classifier);
        };
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/**
 * Populates a parameter form with input fields for classifier parameters
 * @description Creates input fields for each parameter with current values and change handlers
 * @param {Object} parameters - Object mapping parameter names to their default values
 * @returns {void}
 * @example
 * populateParameterForm({ 
 *   "n_estimators": 100, 
 *   "max_depth": 10, 
 *   "random_state": 42 
 * });
 */
export function populateParameterForm(parameters) {
    const form = document.getElementById("parameterForm");
    form.className = "parameter-form";
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

/**
 * Populates the surrogate model parameter form and visualization toggles
 * @description Creates comprehensive form sections for surrogate model configuration and visualization selection
 * @param {HTMLElement} container - DOM container element to populate with form sections
 * @returns {void}
 * @example
 * const container = document.getElementById("surrogateContainer");
 * populateSurrogateForm(container);
 */
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
            label: "Scatter plot PCA decision boundaries step Size",
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
        keepDuplicates: {
            label: "Keep the duplicates in the generated neighborhood",
            type: "select",
            options: ["Yes", "No"],
            default: "No",
        }
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

    const visualizationSection = createSection(
        "Visualization Selection",
        "visualization-toggles"
    );
    container.appendChild(visualizationSection);

    const instructionText = document.createElement("p");
    instructionText.className = "visualization-instruction";
    instructionText.textContent = "Select which visualizations to display (at least one must be selected):";
    visualizationSection.querySelector(".feature-section-content").appendChild(instructionText);

    Object.entries(visualizationToggles).forEach(([param, details]) => {
        createVisualizationToggle(visualizationSection, param, details);
    });
}
