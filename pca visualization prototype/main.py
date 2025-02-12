from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_data_file = "iris.json"  # Default value

@app.get("/switch-data/{file_name}")
async def switch_data(file_name: str):
    global current_data_file
    if file_name in ["iris.json", "fishing.json"]:
        current_data_file = file_name
        return {"message": f"Switched to {file_name}"}
    return {"error": "Invalid file name"}

@app.get("/tree-data")
async def get_decision_tree_data():
    with open(current_data_file) as f:  # Use the current data file
        return json.load(f)