from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import pandas as pd
import numpy as np
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock features list
MOCK_FEATURES = [
    "age", "income", "education_years", "occupation", "credit_score",
    "debt_ratio", "employment_length", "loan_amount", "loan_term"
]

# Create mock dataset
def create_mock_dataset(n_rows=100):
    np.random.seed(42)
    data = {
        "age": np.random.randint(18, 70, n_rows),
        "income": np.random.randint(30000, 150000, n_rows),
        "education_years": np.random.randint(12, 22, n_rows),
        "occupation": np.random.choice(["Engineer", "Teacher", "Doctor", "Sales", "Other"], n_rows),
        "credit_score": np.random.randint(300, 850, n_rows),
        "debt_ratio": np.random.uniform(0, 1, n_rows),
        "employment_length": np.random.randint(0, 30, n_rows),
        "loan_amount": np.random.randint(5000, 50000, n_rows),
        "loan_term": np.random.choice([12, 24, 36, 48, 60], n_rows)
    }
    return pd.DataFrame(data)

# Create mock dataset
MOCK_DF = create_mock_dataset()

@app.get("/")
async def read_root():
    return {"message": "Welcome to the API!"}

@app.get("/api/get-df-features")
async def get_features():
    """Return the list of features from the dataset"""
    return {"features": MOCK_FEATURES}

@app.get("/api/get-dataset")
async def get_dataset():
    """Return the dataset as a list of dictionaries"""
    return {"dataset": MOCK_DF.head(50).to_dict('records')}

@app.post("/api/make-explanation")
async def make_explanation(feature_data: Dict[str, str]):
    """Generate explanation based on feature values"""
    return {
        "explanation": "This is a mock explanation based on the provided features",
        "importance_scores": {
            feature: 0.5 for feature in feature_data.keys()
        }
    }

if __name__ == "__main__":
    # Create static directory if it doesn't exist
    os.makedirs("static", exist_ok=True)
    
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)