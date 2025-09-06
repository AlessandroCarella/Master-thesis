import numpy as np
from typing import Any

def convert_numpy_types(obj: Any) -> Any:
    """
    Recursively convert numpy types to Python native types for JSON serialization.
    
    Args:
        obj: Object that may contain numpy types
        
    Returns:
        Object with all numpy types converted to Python native types
    """
    if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, set):
        return {convert_numpy_types(item) for item in obj}
    else:
        return obj

def safe_json_response(response_data: Any) -> Any:
    """
    Wrapper function to ensure response data is JSON serializable.
    
    Args:
        response_data: The response data to be serialized
        
    Returns:
        JSON-serializable response data
    """
    return convert_numpy_types(response_data)