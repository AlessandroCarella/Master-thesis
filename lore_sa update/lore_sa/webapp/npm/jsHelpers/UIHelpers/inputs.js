/**
 * @fileoverview Input creation utilities for feature forms, surrogate parameters, and visualization toggles
 * @module inputs
 * @author Generated documentation
 */

/**
 * Creates a collapsible section with header and content area
 * @description Generates a standardized section container with title header and content div
 * @param {string} title - The title text to display in the section header
 * @param {string} id - Unique identifier for the section element
 * @returns {HTMLElement} The created section element with header and content areas
 * @example
 * const section = createSection("Feature Settings", "feature-settings");
 * document.body.appendChild(section);
 */
export function createSection(title, id) {
    const section = document.createElement("div");
    section.className = "feature-section";
    section.id = id;

    const header = document.createElement("h3");
    header.className = "feature-section-header";
    header.textContent = title;

    const content = document.createElement("div");
    content.className = "feature-section-content";

    section.appendChild(header);
    section.appendChild(content);

    return section;
}

/**
 * Creates a numeric input control for feature values
 * @description Generates a numeric input with validation, range display, and statistical tooltips
 * @param {HTMLElement} container - The container element to append the input to
 * @param {string} featureName - Name of the feature for labeling and identification
 * @param {Object} details - Statistical details about the feature
 * @param {number} details.min - Minimum allowed value
 * @param {number} details.max - Maximum allowed value
 * @param {number} details.mean - Mean value for tooltip
 * @param {number} details.median - Median value for tooltip
 * @param {number} details.std - Standard deviation for tooltip
 * @returns {void}
 * @example
 * createNumericInput(container, "age", {
 *   min: 18, max: 100, mean: 35.2, median: 34.0, std: 12.5
 * });
 */
export function createNumericInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box numeric-feature";

    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.id = `feature-${featureName}`;
    input.min = details.min.toFixed(2);
    input.max = details.max.toFixed(2);

    const stats = `Min: ${details.min}
Max: ${details.max.toFixed(5)}
Mean: ${details.mean.toFixed(5)}
Median: ${details.median.toFixed(5)}
Std: ${details.std.toFixed(5)}`;

    box.innerHTML = `
        <div class="feature-label" title="${stats}">
            ${featureName}
            <span class="feature-type">Numeric</span>
            <div class="feature-range">Range: ${details.min.toFixed(2)} - ${details.max.toFixed(2)}</div>
        </div>
    `;
    box.appendChild(input);

    addNumericValidation(input, details);
    container.querySelector(".feature-section-content").appendChild(box);
}

/**
 * Adds validation to numeric input fields
 * @description Validates input values against min/max constraints and provides visual feedback
 * @param {HTMLInputElement} input - The input element to add validation to
 * @param {Object} details - Feature constraints
 * @param {number} details.min - Minimum allowed value
 * @param {number} details.max - Maximum allowed value
 * @returns {void}
 * @private
 */
function addNumericValidation(input, details) {
    input.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        if (value < details.min || value > details.max) {
            input.classList.add("invalid");
            input.title = `Value must be between ${details.min} and ${details.max}`;
        } else {
            input.classList.remove("invalid");
            input.title = "";
        }
    });
}

/**
 * Creates a categorical input (dropdown) for feature values
 * @description Generates a select element with all possible categorical values
 * @param {HTMLElement} container - The container element to append the input to
 * @param {string} featureName - Name of the feature for labeling and identification
 * @param {Object} details - Categorical feature details
 * @param {string[]} details.distinct_values - Array of all possible categorical values
 * @returns {void}
 * @example
 * createCategoricalInput(container, "gender", {
 *   distinct_values: ["Male", "Female", "Other"]
 * });
 */
export function createCategoricalInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box categorical-feature";

    const select = createSelectElement(featureName, details.distinct_values);

    box.innerHTML = `
        <div class="feature-label">
            ${featureName}
            <span class="feature-type">Categorical</span>
            <div class="feature-values">${details.distinct_values.length} possible values</div>
        </div>
    `;
    box.appendChild(select);
    container.querySelector(".feature-section-content").appendChild(box);
}

/**
 * Creates an ordinal input (dropdown) for ordered categorical values
 * @description Generates a select element showing the order relationship between values
 * @param {HTMLElement} container - The container element to append the input to
 * @param {string} featureName - Name of the feature for labeling and identification
 * @param {Object} details - Ordinal feature details
 * @param {string[]} details.ordered_values - Array of values in their natural order
 * @returns {void}
 * @example
 * createOrdinalInput(container, "education", {
 *   ordered_values: ["High School", "Bachelor", "Master", "PhD"]
 * });
 */
export function createOrdinalInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box ordinal-feature";

    const select = createSelectElement(featureName, details.ordered_values);

    box.innerHTML = `
        <div class="feature-label">
            ${featureName}
            <span class="feature-type">Ordinal</span>
            <div class="feature-values">Order: ${details.ordered_values.join(
                " → "
            )}</div>
        </div>
    `;
    box.appendChild(select);
    container.querySelector(".feature-section-content").appendChild(box);
}

/**
 * Creates a select element with placeholder and options
 * @description Utility function to create standardized select elements with placeholder
 * @param {string} featureName - Name of the feature for element ID
 * @param {string[]} values - Array of option values
 * @returns {HTMLSelectElement} The created select element
 * @example
 * const select = createSelectElement("color", ["red", "green", "blue"]);
 * @private
 */
export function createSelectElement(featureName, values) {
    const select = document.createElement("select");
    select.id = `feature-${featureName}`;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a value";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    return select;
}

/**
 * Creates input controls for surrogate model parameters
 * @description Generates either numeric inputs or select dropdowns based on parameter type
 * @param {HTMLElement} container - The container element to append the input to
 * @param {string} paramName - Name of the parameter
 * @param {Object} details - Parameter configuration
 * @param {string} details.label - Human-readable label for the parameter
 * @param {string} [details.type] - Input type ("select" for dropdown, undefined for numeric)
 * @param {string[]} [details.options] - Options for select type parameters
 * @param {*} details.default - Default value for the parameter
 * @param {number} [details.min] - Minimum value for numeric parameters
 * @param {number} [details.max] - Maximum value for numeric parameters
 * @param {number} [details.step] - Step size for numeric parameters
 * @returns {void}
 * @example
 * // Numeric parameter
 * createSurrogateInput(container, "neighbourhood_size", {
 *   label: "Neighbourhood Size", min: 10, max: 1000, default: 500, step: 10
 * });
 * // Select parameter  
 * createSurrogateInput(container, "include_original", {
 *   label: "Include Original", type: "select", options: ["Yes", "No"], default: "No"
 * });
 */
export function createSurrogateInput(container, paramName, details) {
    const box = document.createElement("div");
    box.className = "feature-box numeric-feature";

    if (details.type === "select") {
        const select = document.createElement("select");
        select.id = `surrogate-${paramName}`;
        
        details.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.selected = option === details.default;
            select.appendChild(optionElement);
        });

        box.innerHTML = `
            <div class="feature-label">
                ${details.label}
                <span class="feature-type">Select</span>
            </div>
        `;
        box.appendChild(select);
    } else {
        const input = document.createElement("input");
        input.type = "number";
        input.step = details.step;
        input.id = `surrogate-${paramName}`;
        input.min = details.min;
        input.max = details.max;
        input.value = details.default;

        const stats = `Min: ${details.min}
Max: ${details.max}
Default: ${details.default}`;

        box.innerHTML = `
            <div class="feature-label" title="${stats}">
                ${details.label}
                <span class="feature-type">Numeric</span>
                <div class="feature-range">Range: ${details.min} - ${details.max}</div>
            </div>
        `;
        box.appendChild(input);

        addNumericValidation(input, details);
    }

    container.querySelector(".feature-section-content").appendChild(box);
}

/**
 * Creates input controls for dimensionality reduction parameters
 * @description Generates inputs with tooltips for dimensionality reduction technique parameters
 * @param {HTMLElement} container - The container element to append the input to
 * @param {string} method - Name of the dimensionality reduction method (UMAP, PCA, t-SNE, MDS)
 * @param {string} paramName - Name of the parameter
 * @param {Object} details - Parameter configuration
 * @param {string} details.label - Human-readable label for the parameter
 * @param {string} details.type - Input type ("number" or "select")
 * @param {*} details.default - Default value for the parameter
 * @param {string} details.description - Detailed description for tooltip
 * @param {number} [details.min] - Minimum value for numeric parameters
 * @param {number} [details.max] - Maximum value for numeric parameters
 * @param {number} [details.step] - Step size for numeric parameters
 * @param {string[]} [details.options] - Options for select type parameters
 * @returns {void}
 * @example
 * createDimensionalityReductionInput(container, "UMAP", "n_neighbors", {
 *   label: "Number of Neighbors", type: "number", min: 2, max: 200, 
 *   default: 15, step: 1, description: "Number of neighboring points..."
 * });
 */
export function createDimensionalityReductionInput(container, method, paramName, details) {
    const box = document.createElement("div");
    box.className = "feature-box dimensionality-reduction-feature";

    if (details.type === "select") {
        const select = document.createElement("select");
        select.id = `dimreduction-${method.toLowerCase()}-${paramName}`;
        select.className = "dimreduction-parameter";
        
        details.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.selected = option === details.default;
            select.appendChild(optionElement);
        });

        box.innerHTML = `
            <div class="feature-label" title="${details.description}">
                ${details.label}
                <span class="feature-type">Select</span>
                <div class="feature-description">${method} Parameter</div>
            </div>
        `;
        box.appendChild(select);
    } else if (details.type === "number") {
        const input = document.createElement("input");
        input.type = "number";
        input.step = details.step;
        input.id = `dimreduction-${method.toLowerCase()}-${paramName}`;
        input.className = "dimreduction-parameter";
        input.min = details.min;
        input.max = details.max;
        input.value = details.default;

        const tooltipText = `${details.description}

Min: ${details.min}
Max: ${details.max}
Default: ${details.default}`;

        box.innerHTML = `
            <div class="feature-label" title="${tooltipText}">
                ${details.label}
                <span class="feature-type">Numeric</span>
                <div class="feature-range">${method}: ${details.min} - ${details.max}</div>
            </div>
        `;
        box.appendChild(input);

        addNumericValidation(input, details);
    }

    container.appendChild(box);
}

/**
 * Creates a checkbox toggle for visualization selection
 * @description Generates a checkbox with validation to ensure at least one visualization is selected
 * @param {HTMLElement} container - The container element to append the toggle to
 * @param {string} paramName - Name of the visualization parameter
 * @param {Object} details - Toggle configuration
 * @param {string} details.label - Human-readable label for the visualization
 * @param {boolean} details.default - Default checked state
 * @returns {void}
 * @example
 * createVisualizationToggle(container, "scatterPlot", {
 *   label: "2D Scatter Plot", default: true
 * });
 */
export function createVisualizationToggle(container, paramName, details) {
    const box = document.createElement("div");
    box.className = "feature-box visualization-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `viz-${paramName}`;
    checkbox.checked = details.default;
    checkbox.className = "visualization-checkbox";

    checkbox.addEventListener("change", validateVisualizationSelection);

    box.innerHTML = `
        <label for="viz-${paramName}" class="visualization-label">
            <div class="visualization-label-content">
                ${details.label}
                <span class="feature-type">Visualization</span>
            </div>
        </label>
    `;

    const label = box.querySelector("label");
    label.insertBefore(checkbox, label.firstChild);

    container.querySelector(".feature-section-content").appendChild(box);
}

/**
 * Validates that at least one visualization checkbox remains selected
 * @description Prevents unchecking the last selected visualization and shows warning
 * @returns {void}
 * @private
 */
function validateVisualizationSelection() {
    const checkedBoxes = document.querySelectorAll('.visualization-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        this.checked = true;
        showVisualizationWarning();
        return;
    }
    
    clearVisualizationWarning();
}

/**
 * Displays a warning message when trying to uncheck all visualizations
 * @description Shows temporary warning message to user about minimum selection requirement
 * @returns {void}
 * @private
 */
function showVisualizationWarning() {
    clearVisualizationWarning();
    
    const visualizationSection = document.getElementById("visualization-toggles");
    if (visualizationSection) {
        const warning = document.createElement("div");
        warning.className = "visualization-warning";
        warning.textContent = "At least one visualization must be selected.";
        visualizationSection.appendChild(warning);
        
        setTimeout(clearVisualizationWarning, 3000);
    }
}

/**
 * Removes any existing visualization warning messages
 * @description Cleans up warning elements from the DOM
 * @returns {void}
 * @private
 */
function clearVisualizationWarning() {
    const warning = document.querySelector(".visualization-warning");
    if (warning) {
        warning.remove();
    }
}
