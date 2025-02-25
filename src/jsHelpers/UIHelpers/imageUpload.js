import { getState } from "../ui.js"; // Import to access appState

let uploadedImage = null;

export function createImageUploadInterface(container) {
    const state = getState();
    const possibleImageSizes = state.possible_image_sizes || [];
    
    const uploadContainer = createUploadContainer(possibleImageSizes);
    container.appendChild(uploadContainer);
    
    initializeEventListeners(uploadContainer, possibleImageSizes);
}

function createUploadContainer(possibleImageSizes) {
    const uploadContainer = document.createElement("div");
    uploadContainer.className = "image-upload-container";
    uploadContainer.innerHTML = generateUploadContainerHTML(possibleImageSizes);
    return uploadContainer;
}

function generateUploadContainerHTML(possibleImageSizes) {
    const sizeRequirementsText = generateSizeRequirementsText(possibleImageSizes);
    return `
        <h3>Upload image</h3>
        <div id="dropZone" class="drop-zone">
            <div id="dropZonePrompt" class="drop-zone-prompt">
                <p>Drag & drop an image here</p>
                <p>or click to select<br>${sizeRequirementsText}</p>
                <input type="file" id="imageInput" accept="image/*" class="file-input">
            </div>
            <div id="previewContainer" class="preview-container" style="display: none;">
                <img id="imagePreview" src="" alt="Preview">
                <div class="image-info">
                    <span id="imageDimensions"></span>
                </div>
            </div>
        </div>
        <div id="imageError" class="image-error" style="display: none;"></div>
        <div id="uploadStatus" class="upload-status" style="display: none;"></div>
    `;
}

function initializeEventListeners(uploadContainer, possibleImageSizes) {
    const elements = getDOMElements(uploadContainer);
    setupEventListeners(elements, possibleImageSizes);
}

function getDOMElements(container) {
    return {
        dropZone: container.querySelector("#dropZone"),
        dropZonePrompt: container.querySelector("#dropZonePrompt"),
        imageInput: container.querySelector("#imageInput"),
        imagePreview: container.querySelector("#imagePreview"),
        previewContainer: container.querySelector("#previewContainer"),
        imageDimensions: container.querySelector("#imageDimensions"),
        errorContainer: container.querySelector("#imageError"),
        uploadStatus: container.querySelector("#uploadStatus"),
    };
}

function setupEventListeners(elements, possibleImageSizes) {
    elements.dropZone.addEventListener("click", () => {
        if (elements.previewContainer.style.display === "none") {
            elements.imageInput.click();
        }
    });

    elements.dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        elements.dropZone.classList.add("dragover");
    });

    elements.dropZone.addEventListener("dragleave", () => {
        elements.dropZone.classList.remove("dragover");
    });

    elements.dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            processImageFile(e.dataTransfer.files[0], elements, possibleImageSizes);
        }
    });

    elements.imageInput.addEventListener("change", () => {
        if (elements.imageInput.files.length) {
            processImageFile(elements.imageInput.files[0], elements, possibleImageSizes);
        }
    });
}

function processImageFile(file, elements, possibleImageSizes) {
    if (!file.type.match("image.*")) {
        showError("Please select an image file", elements);
        return;
    }

    showStatus("Processing image...", elements);
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => handleImageLoad(img, e.target.result, elements, possibleImageSizes);
        img.onerror = () => showError("Failed to load image. Please try another file.", elements);
        img.src = e.target.result;
    };
    
    reader.onerror = () => showError("Failed to read file. Please try again.", elements);
    reader.readAsDataURL(file);
}

function handleImageLoad(img, imageData, elements, possibleImageSizes) {
    if (isValidImageSize(img.width, img.height, possibleImageSizes)) {
        displayImage(img, imageData, elements);
    } else {
        showError(`ERROR: Image must be ${generateSizeRequirementsText(possibleImageSizes)}. Your image is ${img.width}×${img.height}`, elements);
    }
}

function displayImage(img, imageData, elements) {
    elements.imagePreview.src = imageData;
    elements.imageDimensions.textContent = `${img.width} × ${img.height} pixels`;
    elements.previewContainer.style.display = "block";
    elements.dropZonePrompt.style.display = "none";
    elements.dropZone.classList.add("has-image");
    hideError(elements);
    showStatus("Image loaded successfully! Ready for explanation.", elements);
    uploadedImage = { data: imageData, width: img.width, height: img.height };
}

function generateSizeRequirementsText(sizes) {
    return sizes.length === 1
        ? `(must be ${sizes[0][0]}×${sizes[0][1]} pixels)`
        : `(must be one of these sizes: ${sizes.map(([w, h]) => `${w}×${h}`).join(", ")})`;
}

function isValidImageSize(width, height, possibleImageSizes) {
    return possibleImageSizes.some(([validWidth, validHeight]) => width === validWidth && height === validHeight);
}

export function resetImageUpload() {
    const elements = getDOMElements(document);
    elements.imagePreview.src = "";
    elements.previewContainer.style.display = "none";
    elements.dropZonePrompt.style.display = "block";
    elements.dropZone.classList.remove("has-image", "error");
    elements.imageInput.value = "";
    uploadedImage = null;
    hideError(elements);
    hideStatus(elements);
}

function showError(message, elements) {
    elements.errorContainer.textContent = message;
    elements.errorContainer.style.display = "block";
    elements.uploadStatus.style.display = "none";
}

function hideError(elements) {
    elements.errorContainer.style.display = "none";
}

function showStatus(message, elements) {
    elements.uploadStatus.textContent = message;
    elements.uploadStatus.style.display = "block";
}

function hideStatus(elements) {
    elements.uploadStatus.style.display = "none";
}

export function getUploadedImage() {
    return uploadedImage;
}
