import pandas as pd
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from fastapi.responses import JSONResponse
from pythonHelpers.routes.state import global_state

def process_image_dataset(ds, feature_names, target_names):
    """Process image dataset and return a JSON response with base64-encoded images."""
    sample_size = min(50, len(ds.target))
    image_records = []
    data_array = ds.data.values if hasattr(ds.data, 'iloc') else ds.data
    
    for i in range(sample_size):
        img_data = data_array[i]
        img_array, target_label = process_image_data(img_data, ds.target, target_names, i)
        if img_array is None:
            continue  # Skip if there is no valid image array

        img_str = convert_image_to_base64(img_array)
        
        image_records.append({
            "image": f"data:image/png;base64,{img_str}",
            "label": f"Class: {target_label}"
        })

    return JSONResponse(content={"dataset": image_records})

def process_image_data(img_data, target, target_names, index):
    """Process the image data and return the reshaped image array and the corresponding target label."""
    # Handle 1D or 2D image data
    if img_data.ndim == 1:
        img_array, img_height, img_width = reshape_flattened_image(img_data)
        if img_array is None:
            return None, None  # Skip if no valid image array found
    else:
        img_height, img_width = img_data.shape
        if (img_height, img_width) not in global_state.possible_image_sizes:
            return None, None  # Skip if the size is not in the list of possible sizes
        img_array = img_data
    
    # Normalize the image
    img_array = normalize_image(img_array)
    
    # Get target label
    target_value = target[index] if isinstance(target, np.ndarray) else target.iloc[index]
    target_label = convert_target_to_label(target_value, target_names)
    
    return img_array, target_label

def reshape_flattened_image(img_data):
    """Reshape flattened image data to the correct 2D dimensions."""
    img_size = img_data.shape[0]
    for (height, width) in global_state.possible_image_sizes:
        if height * width == img_size:
            return img_data.reshape(height, width), height, width
    return None, None, None  # Return None if no matching size is found

def normalize_image(img_array):
    """Normalize pixel values to 0-255."""
    if img_array.max() <= 1.0:
        return (img_array * 255).astype(np.uint8)
    return img_array.astype(np.uint8)

def convert_image_to_base64(img_array):
    """Convert an image array to a base64-encoded PNG string."""
    img = Image.fromarray(img_array)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def convert_target_to_label(target_value, target_names):
    """Convert the numeric target value to its corresponding class name."""
    if isinstance(target_value, (int, np.integer)) and isinstance(target_names, list) and len(target_names) > target_value:
        return target_names[target_value]
    return str(target_value)  # Return as string if it's not an integer or no matching name

def encode_image_to_base64(img_array):
    """Convert image array to base64 string."""
    img = Image.fromarray(img_array)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def get_target_label(target_value, target_names):
    """Convert numeric target to class name if available."""
    if isinstance(target_value, (int, np.integer)) and isinstance(target_names, list) and len(target_names) > target_value:
        return target_names[target_value]
    return str(target_value)

def process_tabular_dataset(ds, feature_names):
    """Process tabular dataset and return a JSON response."""
    df = pd.DataFrame(ds.data, columns=feature_names)
    if hasattr(ds, "target"):
        df["target"] = ds.target
    return JSONResponse(content={"dataset": df.to_dict(orient="records")})
