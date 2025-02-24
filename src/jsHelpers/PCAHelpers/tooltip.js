export function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "pca-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "12px")
        .style("pointer-events", "none")
        .style("max-width", "300px")
        .style("font-size", "12px")
        .style("line-height", "1.4");
}

export function showTooltip(event, d, data, tooltip, datasetType) {
    const pointIndex = getPointIndex(event, data);
    if (pointIndex === -1) return;

    const className = data.targets[pointIndex];
    const originalData = data.originalData[pointIndex];

    if (datasetType === "image" && isSquareImage(originalData)) {
        displayImageTooltip(event, tooltip, className, originalData);
    } else {
        displayTabularTooltip(event, tooltip, className, originalData);
    }
}

function getPointIndex(event, data) {
    const targetData = event.target.__data__;
    if (!targetData) return -1;

    const index = data.pcaData.findIndex(
        (p) => p[0] === targetData[0] && p[1] === targetData[1]
    );
    if (index === -1) console.warn("Could not find matching point data");
    return index;
}

function isSquareImage(originalData) {
    const pixelCount = Object.keys(originalData).length;
    const imageSize = Math.sqrt(pixelCount);
    return Math.floor(imageSize) === imageSize;
}

function displayImageTooltip(event, tooltip, className, originalData) {
    const imageSize = Math.sqrt(Object.keys(originalData).length);
    const tooltipContent = `
        <strong>Image (${imageSize}px x ${imageSize}px):</strong><br>
        <canvas id="pixel-canvas" width="${imageSize}" height="${imageSize}" 
                style="width: 200px; height: 200px; image-rendering: pixelated;"></canvas><br>
        <strong>Class: ${className}</strong>
    `;

    showTooltipContent(event, tooltip, tooltipContent);
    renderImage(originalData, imageSize);
}

function renderImage(originalData, imageSize) {
    setTimeout(() => {
        const canvas = document.getElementById("pixel-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(imageSize, imageSize);

        let pixelIndex = 0;
        Object.values(originalData).forEach((value) => {
            const pixelValue =
                typeof value === "number" ? value : parseFloat(value);
            imageData.data.set(
                [pixelValue, pixelValue, pixelValue, 255],
                pixelIndex * 4
            );
            pixelIndex++;
        });

        ctx.putImageData(imageData, 0, 0);
    }, 0);
}

function displayTabularTooltip(event, tooltip, className, originalData) {
    let tooltipContent = "<strong>Decoded Values:</strong><br>";
    Object.entries(originalData).forEach(([feature, value]) => {
        tooltipContent += `${feature}: ${
            typeof value === "number" ? value.toFixed(3) : value
        }<br>`;
    });
    tooltipContent += `<strong>Class: ${className}</strong>`;

    showTooltipContent(event, tooltip, tooltipContent);
}

function showTooltipContent(event, tooltip, content) {
    tooltip
        .html(content)
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 28}px`)
        .transition()
        .duration(200)
        .style("opacity", 1);
}

export function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style("opacity", 0);
}
