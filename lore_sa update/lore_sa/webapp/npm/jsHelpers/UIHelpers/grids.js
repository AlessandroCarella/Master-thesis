/**
 * @fileoverview Grid population utilities for datasets, classifiers, parameters, and surrogate model forms
 * @module grids
 * @author Generated documentation
 */

import { createSection, createCollapsibleSection, createSurrogateInput, createVisualizationToggle, createDimensionalityReductionInput } from "./inputs.js";

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
 * Dimensionality reduction parameter definitions with descriptions
 * @description Configuration object containing parameter specifications for each dimensionality reduction method
 */
const dimensionalityReductionParameters = {
    "UMAP": {
        "n_neighbors": {
            label: "Number of Neighbors",
            type: "number",
            min: 2,
            max: 200,
            default: 15,
            step: 1,
            description: "Number of neighboring points used to approximate the local manifold structure."
        },
        "min_dist": {
            label: "Minimum Distance",
            type: "number",
            min: 0.0,
            max: 2.0,
            default: 0.1,
            step: 0.01,
            description: "Minimum distance between points in the embedding — controls clustering tightness."
        },
        "spread": {
            label: "Spread",
            type: "number",
            min: 0.1,
            max: 3.0,
            default: 1.0,
            step: 0.1,
            description: "Effective scale of embedded points that interacts with min_dist."
        },
        "n_epochs": {
            label: "Number of Epochs",
            type: "number",
            min: 50,
            max: 1000,
            default: 200,
            step: 50,
            description: "Number of training epochs; determined heuristically when None."
        },
        "learning_rate": {
            label: "Learning Rate",
            type: "number",
            min: 0.1,
            max: 5.0,
            default: 1.0,
            step: 0.1,
            description: "Step size for optimization."
        },
        "metric": {
            label: "Distance Metric",
            type: "select",
            options: ["euclidean", "manhattan", "chebyshev", "minkowski", "canberra", "braycurtis", "haversine", "mahalanobis", "wminkowski", "seuclidean", "cosine", "correlation", "hamming", "jaccard", "dice", "russellrao", "kulsinski", "rogerstanimoto", "sokalmichener", "sokalsneath", "yule"],
            default: "euclidean",
            description: "Distance metric used to compute the neighbor graph."
        }
    },
    "PCA": {
        "whiten": {
            label: "Whiten Components",
            type: "select",
            options: ["True", "False"],
            default: "False",
            description: "If True, project onto components with unit variance (decorrelated output)."
        },
        "svd_solver": {
            label: "SVD Solver",
            type: "select",
            options: ["auto", "full", "arpack", "randomized"],
            default: "auto",
            description: "SVD solver used ('auto', 'full', 'arpack', 'randomized')."
        },
        "tol": {
            label: "Tolerance",
            type: "number",
            min: 0.0,
            max: 1.0,
            default: 0.0,
            step: 0.0001,
            description: "Tolerance for singular values when using 'arpack' solver."
        },
        "iterated_power": {
            label: "Iterated Power",
            type: "number",
            min: 1,
            max: 10,
            default: 7,
            step: 1,
            description: "Number of iterations for the randomized SVD solver."
        }
    },
    "t-SNE": {
        "perplexity": {
            label: "Perplexity",
            type: "number",
            min: 5.0,
            max: 50.0,
            default: 30.0,
            step: 1.0,
            description: "Related to the number of nearest neighbors; balances local/global structure (default 30.0)."
        },
        "early_exaggeration": {
            label: "Early Exaggeration",
            type: "number",
            min: 1.0,
            max: 50.0,
            default: 12.0,
            step: 1.0,
            description: "Controls cluster tightness during early optimization (default 12.0)."
        },
        "learning_rate": {
            label: "Learning Rate",
            type: "select",
            options: ["auto", "10", "50", "100", "200", "500", "1000"],
            default: "auto",
            description: "Learning rate for optimization (default 'auto')."
        },
        "max_iter": {
            label: "Maximum Iterations",
            type: "number",
            min: 100,
            max: 5000,
            default: 1000,
            step: 100,
            description: "Maximum number of iterations (default 1000)."
        },
        "metric": {
            label: "Distance Metric",
            type: "select",
            options: ["euclidean", "manhattan", "chebyshev", "minkowski", "canberra", "braycurtis", "cosine", "correlation"],
            default: "euclidean",
            description: "Distance metric in input space (default 'euclidean')."
        },
        "init": {
            label: "Initialization Method",
            type: "select",
            options: ["pca", "random"],
            default: "pca",
            description: "Initialization method ('pca' or 'random'; default 'pca')."
        },
        "method": {
            label: "Optimization Method",
            type: "select",
            options: ["barnes_hut", "exact"],
            default: "barnes_hut",
            description: "Optimization method ('barnes_hut' or 'exact'; default 'barnes_hut')."
        }
    },
    "MDS": {
        "metric": {
            label: "Metric MDS",
            type: "select",
            options: ["True", "False"],
            default: "True",
            description: "If True, metric MDS; if False, non-metric MDS."
        },
        "n_init": {
            label: "Number of Initializations",
            type: "number",
            min: 1,
            max: 20,
            default: 4,
            step: 1,
            description: "Number of SMACOF algorithm initializations (default 4)."
        },
        "max_iter": {
            label: "Maximum Iterations",
            type: "number",
            min: 50,
            max: 1000,
            default: 300,
            step: 50,
            description: "Maximum number of iterations per run (default 300)."
        },
        "eps": {
            label: "Convergence Tolerance",
            type: "number",
            min: 0.0001,
            max: 0.1,
            default: 0.001,
            step: 0.0001,
            description: "Relative tolerance for convergence (default 0.001)."
        },
        "dissimilarity": {
            label: "Dissimilarity Type",
            type: "select",
            options: ["euclidean", "precomputed"],
            default: "euclidean",
            description: "Type of dissimilarity ('euclidean' or 'precomputed')."
        }
    }//,
    // "PaCMAP": {
    //     "n_neighbors": {
    //         label: "Number of Neighbors",
    //         type: "number",
    //         min: 2,
    //         max: 200,
    //         default: 10,
    //         step: 1,
    //         description: "Number of neighbors to consider for each point in the high-dimensional space."
    //     },
    //     "MN_ratio": {
    //         label: "Mid-Near Ratio",
    //         type: "number",
    //         min: 0.1,
    //         max: 1.0,
    //         default: 0.5,
    //         step: 0.1,
    //         description: "Ratio of mid-near pairs (balances local and global structure)."
    //     },
    //     "FP_ratio": {
    //         label: "Further Pairs Ratio",
    //         type: "number",
    //         min: 1.0,
    //         max: 5.0,
    //         default: 2.0,
    //         step: 0.1,
    //         description: "Ratio of further pairs to maintain global structure."
    //     },
    //     "pair_neighbors": {
    //         label: "Pair Neighbors",
    //         type: "number",
    //         min: 2,
    //         max: 100,
    //         default: 10,
    //         step: 1,
    //         description: "Number of neighbors for pair finding (leave at default for automatic selection)."
    //     },
    //     "distance": {
    //         label: "Distance Metric",
    //         type: "select",
    //         options: ["euclidean", "manhattan", "angular", "hamming"],
    //         default: "euclidean",
    //         description: "Distance metric for computing similarities in the original space."
    //     },
    //     "lr": {
    //         label: "Learning Rate",
    //         type: "number",
    //         min: 0.1,
    //         max: 10.0,
    //         default: 1.0,
    //         step: 0.1,
    //         description: "Learning rate for the optimization process."
    //     },
    //     "num_iters": {
    //         label: "Number of Iterations",
    //         type: "number",
    //         min: 100,
    //         max: 1000,
    //         default: 450,
    //         step: 50,
    //         description: "Number of optimization iterations."
    //     },
    //     "verbose": {
    //         label: "Verbose Output",
    //         type: "select",
    //         options: ["True", "False"],
    //         default: "False",
    //         description: "Whether to print progress information during optimization."
    //     },
    //     "apply_pca": {
    //         label: "Apply PCA Preprocessing",
    //         type: "select",
    //         options: ["True", "False"],
    //         default: "True",
    //         description: "Whether to apply PCA preprocessing for dimensionality reduction before PaCMAP."
    //     }
    // }
};

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
            label: "PCA Scatter plot granularity",
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
            default: "Yes",
        }
    };

    const visualizationToggles = {
        scatterPlot: {
            label: "Neighborhood 2D projection",
            default: true,
            alwaysSelected: true,
        },
        blocksTree: {
            label: "Rule and Counterfactual Rules Centred",
            default: true,
            isTreeViz: true,
        },
        classicTree: {
            label: "Tree Layout",
            default: false,
            isTreeViz: true,
        },
        treeSpawn: {
            label: "Rule Centred",
            default: false,
            isTreeViz: true,
        },
    };

    // Surrogate Model Parameters Section
    const section = createSection(
        "Explanation Parameters",
        "surrogate-parameters"
    );
    container.appendChild(section);

    Object.entries(surrogateParameters).forEach(([param, details]) => {
        createSurrogateInput(section, param, details);
    });

    // Dimensionality Reduction techniques Parameters Section - COLLAPSIBLE and COLLAPSED by default
    const dimReductionSection = createCollapsibleSection(
        "Dimensionality Reduction techniques Parameters",
        "dimensionality-reduction-parameters",
        true // collapsed by default
    );
    container.appendChild(dimReductionSection);

    // Create parameters for all methods simultaneously
    Object.entries(dimensionalityReductionParameters).forEach(([method, methodParams]) => {
        // Create a sub-section for each method
        const methodSubSection = createSection(
            `${method} Parameters`,
            `${method.toLowerCase()}-parameters`
        );
        dimReductionSection.querySelector(".feature-section-content").appendChild(methodSubSection);

        // Add parameters for this method
        Object.entries(methodParams).forEach(([paramName, details]) => {
            createDimensionalityReductionInput(
                methodSubSection.querySelector(".feature-section-content"), 
                method, 
                paramName, 
                details
            );
        });
    });

    // Visualization Selection Section
    const visualizationSection = createSection(
        "Visualization Selection",
        "visualization-toggles"
    );
    container.appendChild(visualizationSection);

    Object.entries(visualizationToggles).forEach(([param, details]) => {
        createVisualizationToggle(visualizationSection, param, details);
    });
}
