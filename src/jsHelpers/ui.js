// state.js
let state = null;

export function initializeUI(appState) {
    state = appState;
}

export function getState() {
    return state;
}

// gridRenderers.js
export function populateDatasetGrid(data) {
    const grid = document.getElementById("datasetGrid");
    grid.innerHTML = "";
    
    data.datasets.forEach(dataset => {
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
    
    Object.keys(data.classifiers).forEach(classifier => {
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

// featureInputs.js
export function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = "";

    const sections = {
        numeric: createSection('Numeric Features', 'numeric-features'),
        categorical: createSection('Categorical Features', 'categorical-features'),
        ordinal: createSection('Ordinal Features', 'ordinal-features')
    };

    Object.values(sections).forEach(section => {
        carousel.appendChild(section);
    });

    renderFeatureSections(descriptor, sections);
}

function renderFeatureSections(descriptor, sections) {
    if (descriptor.numeric && Object.keys(descriptor.numeric).length > 0) {
        Object.entries(descriptor.numeric).forEach(([featureName, details]) => {
            createNumericInput(sections.numeric, featureName, details);
        });
    } else {
        sections.numeric.style.display = 'none';
    }

    if (descriptor.categorical && Object.keys(descriptor.categorical).length > 0) {
        Object.entries(descriptor.categorical).forEach(([featureName, details]) => {
            createCategoricalInput(sections.categorical, featureName, details);
        });
    } else {
        sections.categorical.style.display = 'none';
    }

    if (descriptor.ordinal && Object.keys(descriptor.ordinal).length > 0) {
        Object.entries(descriptor.ordinal).forEach(([featureName, details]) => {
            createOrdinalInput(sections.ordinal, featureName, details);
        });
    } else {
        sections.ordinal.style.display = 'none';
    }
}

// components/Section.js
function createSection(title, id) {
    const section = document.createElement('div');
    section.className = 'feature-section';
    section.id = id;
    
    const header = document.createElement('h3');
    header.className = 'feature-section-header';
    header.textContent = title;
    
    const content = document.createElement('div');
    content.className = 'feature-section-content';
    
    section.appendChild(header);
    section.appendChild(content);
    
    return section;
}

// components/NumericInput.js
function createNumericInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box numeric-feature";
    
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.id = `feature-${featureName}`;
    input.min = details.min;
    input.max = details.max;
    
    const stats = `Min: ${details.min}
Max: ${details.max}
Mean: ${details.mean.toFixed(2)}
Median: ${details.median}
Std: ${details.std.toFixed(2)}`;

    box.innerHTML = `
        <div class="feature-label" title="${stats}">
            ${featureName}
            <span class="feature-type">Numeric</span>
            <div class="feature-range">Range: ${details.min} - ${details.max}</div>
        </div>
    `;
    box.appendChild(input);

    addNumericValidation(input, details);
    container.querySelector('.feature-section-content').appendChild(box);
}

function addNumericValidation(input, details) {
    input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value < details.min || value > details.max) {
            input.classList.add('invalid');
            input.title = `Value must be between ${details.min} and ${details.max}`;
        } else {
            input.classList.remove('invalid');
            input.title = '';
        }
    });
}

// components/CategoricalInput.js
function createCategoricalInput(container, featureName, details) {
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
    container.querySelector('.feature-section-content').appendChild(box);
}

// components/OrdinalInput.js
function createOrdinalInput(container, featureName, details) {
    const box = document.createElement("div");
    box.className = "feature-box ordinal-feature";
    
    const select = createSelectElement(featureName, details.ordered_values);

    box.innerHTML = `
        <div class="feature-label">
            ${featureName}
            <span class="feature-type">Ordinal</span>
            <div class="feature-values">Order: ${details.ordered_values.join(' → ')}</div>
        </div>
    `;
    box.appendChild(select);
    container.querySelector('.feature-section-content').appendChild(box);
}

// utils/selectUtils.js
function createSelectElement(featureName, values) {
    const select = document.createElement("select");
    select.id = `feature-${featureName}`;
    
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a value";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    
    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    return select;
}

// featureValues.js
export function getFeatureValues() {
    const state = getState();
    if (!state?.featureDescriptor) return {};
    
    const descriptor = state.featureDescriptor;
    const values = {};
    
    if (descriptor.numeric) {
        Object.keys(descriptor.numeric).forEach(feature => {
            const input = document.getElementById(`feature-${feature}`);
            values[feature] = parseFloat(input.value);
        });
    }
    
    if (descriptor.categorical) {
        Object.keys(descriptor.categorical).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }
    
    if (descriptor.ordinal) {
        Object.keys(descriptor.ordinal).forEach(feature => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }
    
    return values;
}

// utils/statistics.js
function getMode(values) {
    const counts = values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
    
    const maxCount = Math.max(...Object.values(counts));
    const modes = Object.keys(counts).filter(key => counts[key] === maxCount);
    
    return modes[0];
}

// features.js
export function resetFeatures() {
    const state = getState();
    if (!state?.featureDescriptor) return;
    
    const descriptor = state.featureDescriptor;
    
    if (descriptor.numeric) {
        Object.entries(descriptor.numeric).forEach(([feature, details]) => {
            const input = document.getElementById(`feature-${feature}`);
            input.value = details.median || '';
            input.classList.remove('invalid');
        });
    }
    
    if (descriptor.categorical) {
        Object.entries(descriptor.categorical).forEach(([feature, details]) => {
            const select = document.getElementById(`feature-${feature}`);
            const modeValue = getMode(details.distinct_values);
            
            Array.from(select.options).forEach((option, index) => {
                if (option.value === modeValue) {
                    select.selectedIndex = index;
                }
            });
        });
    }
    
    if (descriptor.ordinal) {
        Object.entries(descriptor.ordinal).forEach(([feature, details]) => {
            const select = document.getElementById(`feature-${feature}`);
            const modeValue = getMode(details.ordered_values);
            
            Array.from(select.options).forEach((option, index) => {
                if (option.value === modeValue) {
                    select.selectedIndex = index;
                }
            });
        });
    }
}