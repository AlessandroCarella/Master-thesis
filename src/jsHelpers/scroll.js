// Scroll smoothly using requestAnimationFrame
export function scrollToElement(element, offset = 30, duration = 500) {
    const targetElement =
        typeof element === "string"
            ? document.getElementById(element)
            : element;

    if (!targetElement) {
        console.warn(`Scroll target not found: ${element}`);
        return;
    }

    const start = window.scrollY;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const target = start + elementPosition - offset;
    const startTime = performance.now();

    function scrollStep(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // Normalize progress (0 to 1)

        // Ease-in-out function for smooth animation
        const easeInOutQuad =
            progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        window.scrollTo(0, start + (target - start) * easeInOutQuad);

        if (progress < 1) {
            requestAnimationFrame(scrollStep);
        }
    }

    requestAnimationFrame(scrollStep);
}
