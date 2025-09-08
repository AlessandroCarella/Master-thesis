from typing import Any, Dict, List, Union, Set
import numpy as np


def convert_numpy_types(obj: Any) -> Any:
    """
    Recursively convert NumPy types to JSON-serializable Python types.
    
    Parameters
    ----------
    obj : Any
        Object that may contain NumPy types needing conversion.
        
    Returns
    -------
    Any
        Object with NumPy types converted to native Python types.
        
    Notes
    -----
    Handles nested structures including dictionaries, lists, tuples, and sets.
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
    Ensure response data is JSON-serializable by converting NumPy types.
    
    Parameters
    ----------
    response_data : Any
        Response data that may contain NumPy types.
        
    Returns
    -------
    Any
        JSON-serializable response data.
    """
    return convert_numpy_types(response_data)
