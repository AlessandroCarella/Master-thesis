import {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
} from "./UIHelpers/grids.js";
import {
    createSection,
    createNumericInput,
    createCategoricalInput,
    createOrdinalInput,
} from "./UIHelpers/inputs.js";
import { getDatasetType } from "./visualizationConnector.js";

let state = null;
let uploadedImage = null;

export function initializeUI(appState) {
    state = appState;
}

export function getState() {
    return state;
}

export function createFeatureInputs(descriptor) {
    const carousel = document.getElementById("featureCarousel");
    carousel.innerHTML = "";

    // Get dataset type from the visualization connector
    const datasetType = getDatasetType();

    // If the dataset is an image type, display image upload interface
    if (datasetType === "image") {
        createImageUploadInterface(carousel);
        return;
    }
    else {
        // Regular flow for non-image datasets
        const sections = {
            numeric: createSection("Numeric Features", "numeric-features"),
            categorical: createSection(
                "Categorical Features",
                "categorical-features"
            ),
            ordinal: createSection("Ordinal Features", "ordinal-features"),
        };
    
        Object.values(sections).forEach((section) => {
            carousel.appendChild(section);
        });
    
        renderFeatureSections(descriptor, sections);
        setDefaultFeatureValues(descriptor);
    }
}

function createImageUploadInterface(container) {
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
                    <button id="removeImage" class="btn btn-small">Remove</button>
                </div>
            </div>
        </div>
        <div id="imageError" class="image-error" style="display: none;"></div>
        <div id="uploadStatus" class="upload-status" style="display: none;"></div>
    `;
    
    container.appendChild(uploadContainer);
    
    // Add styles for the image upload interface
    const style = document.createElement("style");
    style.textContent = `
        .image-upload-container {
            width: 100%;
            padding: 20px;
        }
        .drop-zone {
            border: 2px dashed #ccc;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: border 0.3s, background-color 0.3s;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .drop-zone:hover {
            border-color: #2196F3;
            background-color: rgba(33, 150, 243, 0.05);
        }
        .drop-zone.dragover {
            border-color: #2196F3;
            background-color: rgba(33, 150, 243, 0.1);
        }
        .drop-zone.has-image {
            background-color: rgba(76, 175, 80, 0.05);
            border-color: #4CAF50;
        }
        .file-input {
            display: none;
        }
        .preview-container {
            text-align: center;
            width: 100%;
        }
        .preview-container img {
            max-width: 196px;
            max-height: 196px;
            border: 1px solid #ddd;
            padding: 5px;
            background: #fff;
            image-rendering: pixelated;
            margin-bottom: 10px;
        }
        .image-info {
            margin-top: 10px;
            font-size: 14px;
        }
        .image-error {
            color: #d32f2f;
            margin-top: 10px;
            font-weight: bold;
            padding: 10px;
            background-color: rgba(211, 47, 47, 0.1);
            border-radius: 4px;
            text-align: center;
        }
        .upload-status {
            color: #4CAF50;
            margin-top: 10px;
            font-weight: bold;
            padding: 10px;
            background-color: rgba(76, 175, 80, 0.1);
            border-radius: 4px;
            text-align: center;
        }
        .btn-small {
            padding: 5px 10px;
            margin-top: 5px;
            font-size: 12px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: A4px;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
    
    // Get DOM elements
    const dropZone = document.getElementById("dropZone");
    const dropZonePrompt = document.getElementById("dropZonePrompt");
    const imageInput = document.getElementById("imageInput");
    const imagePreview = document.getElementById("imagePreview");
    const previewContainer = document.getElementById("previewContainer");
    const imageDimensions = document.getElementById("imageDimensions");
    const removeButton = document.getElementById("removeImage");
    const errorContainer = document.getElementById("imageError");
    const uploadStatus = document.getElementById("uploadStatus");
    
    // Setup event listeners
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
            processImageFile(e.dataTransfer.files[0]);
        }
    });
    
    // File input change event
    imageInput.addEventListener("change", () => {
        if (imageInput.files.length) {
            processImageFile(imageInput.files[0]);
        }
    });
    
    // Remove button click event
    removeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        resetImageUpload();
    });
    
    function processImageFile(file) {
        if (!file.type.match('image.*')) {
            showError("Please select an image file");
            return;
        }
        
        // Show loading status
        showStatus("Processing image...");
        
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
                    hideError();
                    showStatus("Image loaded successfully! Ready for explanation.");
                    
                    // Store the image data
                    uploadedImage = {
                        data: e.target.result,
                        width: img.width,
                        height: img.height
                    };
                } else {
                    // Invalid dimensions
                    showError(`Image must be 28×28 pixels. Current dimensions: ${img.width}×${img.height}`);
                    resetImageUpload();
                }
            };
            
            img.onerror = () => {
                showError("Failed to load image. Please try another file.");
                resetImageUpload();
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            showError("Failed to read file. Please try again.");
            resetImageUpload();
        };
        
        reader.readAsDataURL(file);
    }
    
    function resetImageUpload() {
        imagePreview.src = "";
        previewContainer.style.display = "none";
        dropZonePrompt.style.display = "block";
        dropZone.classList.remove("has-image");
        imageInput.value = "";
        uploadedImage = null;
        hideError();
        hideStatus();
    }
    
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
        uploadStatus.style.display = "none";
    }
    
    function hideError() {
        errorContainer.style.display = "none";
    }
    
    function showStatus(message) {
        uploadStatus.textContent = message;
        uploadStatus.style.display = "block";
    }
    
    function hideStatus() {
        uploadStatus.style.display = "none";
    }
}

function renderFeatureSections(descriptor, sections) {
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

function setDefaultFeatureValues(descriptor) {
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

    // Check if we're dealing with an image dataset
    const datasetType = getDatasetType();
    if (datasetType === "image") {
        // For image datasets, return the uploaded image data if available
        if (uploadedImage) {
            return {
                image: uploadedImage.data,
                imageWidth: uploadedImage.width,
                imageHeight: uploadedImage.height
            };
        }
        return {};
    }

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

function getMode(values) {
    const counts = values.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});

    const maxCount = Math.max(...Object.values(counts));
    const modes = Object.keys(counts).filter((key) => counts[key] === maxCount);

    return modes[0];
}

export function resetFeatures() {
    const state = getState();
    if (!state?.featureDescriptor) return;

    // Check if we're dealing with an image dataset
    const datasetType = getDatasetType();
    if (datasetType === "image") {
        // Reset the image upload interface
        const removeButton = document.getElementById("removeImage");
        if (removeButton) {
            removeButton.click();
        }
        return;
    }

    setDefaultFeatureValues(state.featureDescriptor);
}

export function getSurrogateParameters() {
    return {
        neighbourhood_size: parseFloat(
            document.getElementById("surrogate-neighbourhood_size").value
        ),
        PCAstep: parseFloat(
            document.getElementById("surrogate-pca_step").value
        ),
    };
}

export {
    populateDatasetGrid,
    populateClassifierGrid,
    populateParameterForm,
    populateSurrogateForm,
};
