/**
 * @fileoverview Smooth scrolling utility using requestAnimationFrame for enhanced user experience.
 * Provides eased scrolling animation with configurable duration and offset.
 * @author Generated documentation
 * @module ScrollUtils
 */

/**
 * Smoothly scrolls to a target element using requestAnimationFrame animation.
 * Uses ease-in-out quadratic function for natural scrolling motion.
 * 
 * @param {HTMLElement|string} element - Target element or element ID to scroll to
 * @param {number} [offset=30] - Offset from top of element in pixels
 * @param {number} [duration=500] - Animation duration in milliseconds
 * @throws {Error} When target element cannot be found
 * @example
 * // Scroll to element with default settings
 * scrollToElement(document.getElementById('target'));
 * 
 * @example
 * // Scroll to element by ID with custom offset
 * scrollToElement('section-header', 50);
 * 
 * @example
 * // Scroll with custom duration and offset
 * scrollToElement(myElement, 20, 800);
 * 
 * @see requestAnimationFrame
 */
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

    /**
     * Performs a single step of the scroll animation.
     * Uses ease-in-out quadratic easing function for smooth motion.
     * 
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     * @private
     */
    function scrollStep(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

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
