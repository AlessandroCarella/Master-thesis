// Generic helpers

export function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function findBranchPoint(path, instancePath) {
    let branchPoint = 0;
    const n = Math.min(path.length, instancePath.length);
    for (let i = 0; i < n; i++) {
        if (path[i] === instancePath[i]) branchPoint = i;
        else break;
    }
    return branchPoint;
}

// Calculate optimal font size for multi-line labels inside a rectangle
export function calculateFontSize(lines, rectWidth, rectHeight) {
    const padding = 10;
    const lineHeight = 1.2;
    const availableWidth = rectWidth - padding * 2;
    const availableHeight = rectHeight - padding * 2;

    const maxTextLength = Math.max(
        ...lines.map((line) => (line ?? "").toString().length)
    );
    const fontSizeBasedOnWidth =
        availableWidth / Math.max(1, maxTextLength * 0.6);
    const fontSizeBasedOnHeight =
        availableHeight / Math.max(1, lines.length * lineHeight);

    let fontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);
    fontSize = Math.max(8, Math.min(20, fontSize));
    return fontSize;
}
