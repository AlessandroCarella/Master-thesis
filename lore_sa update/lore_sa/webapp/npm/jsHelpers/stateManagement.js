/**
 * @fileoverview State management utilities for application configuration and UI loading states.
 * Provides centralized parameter updates and loading state management with UI coordination.
 * @author Generated documentation
 * @module StateManagement
 */

/**
 * @typedef {Object} LoadingState
 * @property {boolean} isLoading - Current loading state
 * @property {Function} setLoading - Updates loading state and UI
 * @property {Function} updateUI - Updates UI elements based on loading state
 */

/**
 * Updates a parameter value in the current application state.
 * Provides centralized parameter management for classifier configuration.
 * 
 * @param {string} param - Parameter name to update
 * @param {*} value - New parameter value
 * @example
 * updateParameter('n_estimators', 100);
 * // Updates RandomForest n_estimators parameter
 * 
 * @example
 * updateParameter('learning_rate', 0.01);
 * // Updates learning rate for gradient boosting
 */
export function updateParameter(param, value) {
    if (window.currentState) {
        window.currentState.parameters[param] = value;
    }
}

/**
 * Global loading state manager with UI coordination.
 * Handles loading states and automatically updates UI elements to prevent interactions during operations.
 * 
 * @type {LoadingState}
 * @example
 * loadingState.setLoading(true);
 * // Disables all buttons, cards, and inputs
 * 
 * @example
 * if (loadingState.isLoading) {
 *   return; // Prevent operation during loading
 * }
 */
export const loadingState = {
    /**
     * Current loading state
     * @type {boolean}
     */
    isLoading: false,
    
    /**
     * Sets the loading state and triggers UI updates.
     * Automatically disables/enables interactive elements based on loading state.
     * 
     * @param {boolean} isLoading - New loading state
     * @example
     * loadingState.setLoading(true);
     * // All interactive elements disabled
     * 
     * loadingState.setLoading(false);
     * // Interactive elements re-enabled
     */
    setLoading: function (isLoading) {
        this.isLoading = isLoading;
        this.updateUI();
    },
    
    /**
     * Updates UI elements based on current loading state.
     * Disables/enables buttons, cards, and inputs to prevent user interaction during loading operations.
     * Called automatically by setLoading but can be called manually if needed.
     * 
     * @example
     * loadingState.updateUI();
     * // Applies current loading state to all UI elements
     */
    updateUI: function () {
        const allButtons = document.querySelectorAll("button");
        const allCards = document.querySelectorAll(".carousel-card");
        const allInputs = document.querySelectorAll("input, select");

        if (this.isLoading) {
            allButtons.forEach((btn) => (btn.disabled = true));
            allCards.forEach((card) => card.classList.add("disabled"));
            allInputs.forEach((input) => (input.disabled = true));
        } else {
            allButtons.forEach((btn) => (btn.disabled = false));
            allCards.forEach((card) => card.classList.remove("disabled"));
            allInputs.forEach((input) => (input.disabled = false));
        }
    },
};
