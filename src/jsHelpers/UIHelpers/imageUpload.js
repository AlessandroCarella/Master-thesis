import { getDatasetType } from "../visualizationConnector.js";

let uploadedImage = null;

export function createImageUploadInterface(container) {
    // Create the image upload container
    const uploadContainer = document.createElement("div");
    uploadContainer.className = "image-upload-container";
    uploadContainer.innerHTML = `
        <h3>Upload 28×28 pixel image</h3>
        <div id="dropZone" class="drop-zone">
            <div id="dropZonePrompt" class="drop-zone-prompt">
                <p>Drag & drop an image here</p>
                <p>or click to select<br>(must be 28x28 pixels)</p>
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

    container.appendChild(uploadContainer);

    // Get DOM elements
    const dropZone = document.getElementById("dropZone");
    const dropZonePrompt = document.getElementById("dropZonePrompt");
    const imageInput = document.getElementById("imageInput");
    const imagePreview = document.getElementById("imagePreview");
    const previewContainer = document.getElementById("previewContainer");
    const imageDimensions = document.getElementById("imageDimensions");
    const errorContainer = document.getElementById("imageError");
    const uploadStatus = document.getElementById("uploadStatus");

    // Setup event listeners
    setupEventListeners(
        dropZone,
        dropZonePrompt,
        imageInput,
        imagePreview,
        previewContainer,
        imageDimensions,
        errorContainer,
        uploadStatus
    );
}

function setupEventListeners(
    dropZone,
    dropZonePrompt,
    imageInput,
    imagePreview,
    previewContainer,
    imageDimensions,
    errorContainer,
    uploadStatus
) {
    dropZone.addEventListener("click", () => {
        if (previewContainer.style.display === "none") {
            imageInput.click();
        }
    });

    // Drag and drop events
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");

        if (e.dataTransfer.files.length) {
            processImageFile(
                e.dataTransfer.files[0],
                imagePreview,
                previewContainer,
                dropZonePrompt,
                dropZone,
                imageDimensions,
                errorContainer,
                uploadStatus
            );
        }
    });

    // File input change event
    imageInput.addEventListener("change", () => {
        if (imageInput.files.length) {
            processImageFile(
                imageInput.files[0],
                imagePreview,
                previewContainer,
                dropZonePrompt,
                dropZone,
                imageDimensions,
                errorContainer,
                uploadStatus
            );
        }
    });
}

function processImageFile(
    file,
    imagePreview,
    previewContainer,
    dropZonePrompt,
    dropZone,
    imageDimensions,
    errorContainer,
    uploadStatus
) {
    if (!file.type.match("image.*")) {
        showError("Please select an image file", errorContainer, uploadStatus);
        return;
    }

    // Show loading status
    showStatus("Processing image...", uploadStatus);

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            if (img.width === 28 && img.height === 28) {
                // Valid dimensions - show the image
                imagePreview.src = e.target.result;
                imageDimensions.textContent = `${img.width} × ${img.height} pixels`;
                previewContainer.style.display = "block";
                dropZonePrompt.style.display = "none";
                dropZone.classList.add("has-image");
                hideError(errorContainer);
                showStatus(
                    "Image loaded successfully! Ready for explanation.",
                    uploadStatus
                );

                // Store the image data
                uploadedImage = {
                    data: e.target.result,
                    width: img.width,
                    height: img.height,
                };
            } else {
                // Invalid dimensions - show more prominent error
                dropZone.classList.add("error");
                showError(
                    `ERROR: Image must be exactly 28x28 pixels. Your image is ${img.width}×${img.height}`,
                    errorContainer, 
                    uploadStatus
                );
                
                // Reset the image upload but don't call resetImageUpload() which would require all elements
                // Instead, reset the relevant parts directly
                imagePreview.src = "";
                previewContainer.style.display = "none";
                dropZonePrompt.style.display = "block";
                uploadedImage = null;
            }
        };

        img.onerror = () => {
            showError(
                "Failed to load image. Please try another file.",
                errorContainer,
                uploadStatus
            );
            // Same issue here - don't call resetImageUpload without arguments
            imagePreview.src = "";
            previewContainer.style.display = "none";
            dropZonePrompt.style.display = "block";
            uploadedImage = null;
        };

        img.src = e.target.result;
    };

    reader.onerror = () => {
        showError(
            "Failed to read file. Please try again.",
            errorContainer,
            uploadStatus
        );
        // Same issue here
        imagePreview.src = "";
        previewContainer.style.display = "none";
        dropZonePrompt.style.display = "block";
        uploadedImage = null;
    };

    reader.readAsDataURL(file);
}

export function resetImageUpload() {
    const imagePreview = document.getElementById("imagePreview");
    const previewContainer = document.getElementById("previewContainer");
    const dropZonePrompt = document.getElementById("dropZonePrompt");
    const dropZone = document.getElementById("dropZone");
    const imageInput = document.getElementById("imageInput");
    const errorContainer = document.getElementById("imageError");
    const uploadStatus = document.getElementById("uploadStatus");

    if (imagePreview) {
        imagePreview.src = "";
        previewContainer.style.display = "none";
        dropZonePrompt.style.display = "block";
        dropZone.classList.remove("has-image");
        dropZone.classList.remove("error"); // Remove error class if present
        imageInput.value = "";
        uploadedImage = null;
        hideError(errorContainer);
        hideStatus(uploadStatus);
    }
}

function showError(message, errorContainer, uploadStatus) {
    errorContainer.textContent = message;
    errorContainer.style.display = "block";
    errorContainer.style.color = "#ff3333";
    errorContainer.style.fontWeight = "bold";
    uploadStatus.style.display = "none";
}

function hideError(errorContainer) {
    errorContainer.style.display = "none";
}

function showStatus(message, uploadStatus) {
    uploadStatus.textContent = message;
    uploadStatus.style.display = "block";
}

function hideStatus(uploadStatus) {
    uploadStatus.style.display = "none";
}

export function getUploadedImage() {
    return uploadedImage;
}
