export function updateParameter(param, value) {
    if (window.currentState) {
        window.currentState.parameters[param] = value;
    }
}

// Add a loading state manager
export const loadingState = {
    isLoading: false,
    setLoading: function (isLoading) {
        this.isLoading = isLoading;
        this.updateUI();
    },
    updateUI: function () {
        const allButtons = document.querySelectorAll("button");
        const allCards = document.querySelectorAll(".carousel-card");
        const allInputs = document.querySelectorAll("input, select");

        if (this.isLoading) {
            // Disable all interactive elements
            allButtons.forEach((btn) => (btn.disabled = true));
            allCards.forEach((card) => card.classList.add("disabled"));
            allInputs.forEach((input) => (input.disabled = true));
        } else {
            // Re-enable all interactive elements
            allButtons.forEach((btn) => (btn.disabled = false));
            allCards.forEach((card) => card.classList.remove("disabled"));
            allInputs.forEach((input) => (input.disabled = false));
        }
    },
};
