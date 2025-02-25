# routes/explain.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
import io
from PIL import Image
import numpy as np

from pythonHelpers.lore import create_neighbourhood_with_lore, get_lore_decision_tree_surrogate
from pythonHelpers.generate_decision_tree_visualization_data import (
    generate_decision_tree_visualization_data,
    extract_tree_structure
)
from pythonHelpers.generate_pca_visualization_data import generate_pca_visualization_data
from pythonHelpers.datasets import DATASETS
from pythonHelpers.routes.state import global_state

router = APIRouter(prefix="/api")

class InstanceRequest(BaseModel):
    instance: Optional[Dict[str, Any]] = None
    image: Optional[str] = None
    instance_type: Optional[str] = "tabular"
    dataset_name: str
    neighbourhood_size: int
    PCAstep: float

@router.post("/explain")
async def explain_instance(request: InstanceRequest):
    """
    Generate a local explanation for a given instance.
    Supports both tabular and image data.
    """
    # Process the instance based on its type.
    if request.instance_type == "image" and request.image:
        try:
            image_data = request.image.split(',', 1)[-1] if ',' in request.image else request.image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert('L')

            # Verify image dimensions (e.g., MNIST expects 28x28 pixels)
            if image.width != 28 or image.height != 28:
                return JSONResponse(
                    content={"error": f"Image must be 28x28 pixels. Got {image.width}x{image.height}"},
                    status_code=400
                )
            instance_values = np.array(image).flatten().ravel()
        except Exception as e:
            return JSONResponse(
                content={"error": f"Error processing image: {str(e)}"},
                status_code=400
            )
    else:
        if not request.instance:
            return JSONResponse(content={"error": "No instance data provided"}, status_code=400)
        # Order the values according to the feature names stored in the global state.
        instance_values = [request.instance[feature] for feature in global_state.feature_names]

    # Create a neighbourhood for local explanation.
    neighbourood, neighb_train_X, neighb_train_y, neighb_train_yz = create_neighbourhood_with_lore(
        instance=instance_values,
        bbox=global_state.bbox,
        dataset=global_state.dataset,
        neighbourhood_size=request.neighbourhood_size,
    )

    global_state.target_names = list(np.unique(neighb_train_y))

    # Generate a surrogate decision tree model.
    dt_surr = get_lore_decision_tree_surrogate(
        neighbour=neighbourood,
        neighb_train_yz=neighb_train_yz
    )

    # Extract the decision tree structure for visualization.
    decision_tree_structure = extract_tree_structure(
        tree_classifier=dt_surr,
        feature_names=global_state.feature_names,
        target_names=global_state.target_names
    )
    decisionTreeVisualizationData = generate_decision_tree_visualization_data(decision_tree_structure)

    # Generate PCA visualization data.
    PCAvisualizationData = generate_pca_visualization_data(
        feature_names=global_state.feature_names,
        X=neighb_train_X,
        y=neighb_train_y,
        pretrained_tree=dt_surr,
        class_names=global_state.target_names,
        step=request.PCAstep
    )

    return {
        "status": "success",
        "message": "Instance explained",
        "decisionTreeVisualizationData": decisionTreeVisualizationData,
        "PCAvisualizationData": PCAvisualizationData,
        "uniqueClasses": global_state.target_names,
        "datasetType": DATASETS.get(global_state.dataset_name, 'unknown')
    }
