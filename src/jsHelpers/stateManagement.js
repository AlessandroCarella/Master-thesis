export function updateParameter(param, value) {
    if (window.currentState) {
        window.currentState.parameters[param] = value;
    }
}