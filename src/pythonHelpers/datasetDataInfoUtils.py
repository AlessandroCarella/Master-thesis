import pandas as pd
from fastapi.responses import JSONResponse

def process_tabular_dataset(ds, feature_names):
    """Process tabular dataset and return a JSON response."""
    df = pd.DataFrame(ds.data, columns=feature_names)
    if hasattr(ds, "target"):
        df["target"] = ds.target
    return JSONResponse(content={"dataset": df.to_dict(orient="records")})
