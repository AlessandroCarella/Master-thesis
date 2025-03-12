import { getState } from "../ui.js";
import { createNumericInput } from "./inputs.js";

export function renderFeatureSections(descriptor, sections) {
    if (descriptor.numeric && Object.keys(descriptor.numeric).length > 0) {
        Object.entries(descriptor.numeric).forEach(([featureName, details]) => {
            createNumericInput(sections.numeric, featureName, details);
        });
    } else {
        sections.numeric.style.display = "none";
    }

    if (
        descriptor.categorical &&
        Object.keys(descriptor.categorical).length > 0
    ) {
        Object.entries(descriptor.categorical).forEach(
            ([featureName, details]) => {
                createCategoricalInput(
                    sections.categorical,
                    featureName,
                    details
                );
            }
        );
    } else {
        sections.categorical.style.display = "none";
    }

    if (descriptor.ordinal && Object.keys(descriptor.ordinal).length > 0) {
        Object.entries(descriptor.ordinal).forEach(([featureName, details]) => {
            createOrdinalInput(sections.ordinal, featureName, details);
        });
    } else {
        sections.ordinal.style.display = "none";
    }
}

function getMode(values) {
    const counts = values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    const modes = Object.keys(counts).filter((key) => counts[key] === maxCount);

    return modes[0];
}

export function setDefaultFeatureValues(descriptor) {
    if (descriptor.numeric) {
        Object.entries(descriptor.numeric).forEach(([feature, details]) => {
            const input = document.getElementById(`feature-${feature}`);
            input.value = details.median.toFixed(2) || "";
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

export function getFeatureValues() {
    const state = getState();
    if (!state?.featureDescriptor) return {};

    const descriptor = state.featureDescriptor;
    const values = {};

    if (descriptor.numeric) {
        Object.keys(descriptor.numeric).forEach((feature) => {
            const input = document.getElementById(`feature-${feature}`);
            values[feature] = parseFloat(input.value);
        });
    }

    if (descriptor.categorical) {
        Object.keys(descriptor.categorical).forEach((feature) => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }

    if (descriptor.ordinal) {
        Object.keys(descriptor.ordinal).forEach((feature) => {
            const select = document.getElementById(`feature-${feature}`);
            values[feature] = select.value;
        });
    }

    return values;
}

export function resetFeatures() {
    const state = getState();
    if (!state?.featureDescriptor) return;

    setDefaultFeatureValues(state.featureDescriptor);
}

export function getSurrogateParameters() {
    return {
        neighbourhood_size: parseFloat(
            document.getElementById("surrogate-neighbourhood_size").value
        ),
        scatterPlotStep: parseFloat(
            document.getElementById("surrogate-scatterPlotStep").value
        ),
    };
}
