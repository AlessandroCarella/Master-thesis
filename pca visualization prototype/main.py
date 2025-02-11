from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

data_file = "iris.json"
data_file = 'fishing.json'

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/tree-data")
async def get_decision_tree_data():
    with open (data_file) as f:
        return json.load(f)