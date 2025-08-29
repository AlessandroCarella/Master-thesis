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

export function createSurrogateInput(container, paramName, details) {
    const box = document.createElement("div");
    box.className = "feature-box numeric-feature";

    if (details.type === "select") {
        // Create select element for dropdown options
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
        // Original numeric input
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

export function createVisualizationToggle(container, paramName, details) {
    const box = document.createElement("div");
    box.className = "feature-box visualization-toggle";

    // Create checkbox input
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `viz-${paramName}`;
    checkbox.checked = details.default;
    checkbox.className = "visualization-checkbox";

    // Add validation to ensure at least one is selected
    checkbox.addEventListener("change", validateVisualizationSelection);

    box.innerHTML = `
        <label for="viz-${paramName}" class="visualization-label">
            <div class="visualization-label-content">
                ${details.label}
                <span class="feature-type">Visualization</span>
            </div>
        </label>
    `;

    // Insert checkbox before label text
    const label = box.querySelector("label");
    label.insertBefore(checkbox, label.firstChild);

    container.querySelector(".feature-section-content").appendChild(box);
}

function validateVisualizationSelection() {
    const checkedBoxes = document.querySelectorAll('.visualization-checkbox:checked');
    
    // If no checkboxes are selected, prevent unchecking the last one
    if (checkedBoxes.length === 0) {
        // Re-check this checkbox
        this.checked = true;
        
        // Show warning message
        showVisualizationWarning();
        return;
    }
    
    // Clear any existing warning
    clearVisualizationWarning();
}

function showVisualizationWarning() {
    // Remove any existing warning
    clearVisualizationWarning();
    
    const visualizationSection = document.getElementById("visualization-toggles");
    if (visualizationSection) {
        const warning = document.createElement("div");
        warning.className = "visualization-warning";
        warning.textContent = "At least one visualization must be selected.";
        visualizationSection.appendChild(warning);
        
        // Remove warning after 3 seconds
        setTimeout(clearVisualizationWarning, 3000);
    }
}

function clearVisualizationWarning() {
    const warning = document.querySelector(".visualization-warning");
    if (warning) {
        warning.remove();
    }
}
