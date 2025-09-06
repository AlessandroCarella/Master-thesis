import psutil
import time
from fastapi.middleware.cors import CORSMiddleware
import os
import threading
import subprocess
import time
import requests
import sys
import socket
import uvicorn
import psutil

def _update_cors_origins(client_port):
    """Update CORS origins dynamically based on the actual ports."""
    # Generate localhost origins for the client port
    dynamic_origins = [
        f"http://localhost:{client_port}",
        f"http://127.0.0.1:{client_port}",
    ]
    
    # Get any additional origins from environment (excluding defaults)
    env_origins_raw = os.environ.get("ALLOWED_ORIGINS", "")
    if env_origins_raw and env_origins_raw != "http://localhost:*":
        env_origins = [origin.strip() for origin in env_origins_raw.split(",") if origin.strip()]
        # Filter out any localhost origins that might conflict
        env_origins = [origin for origin in env_origins if not origin.startswith("http://localhost:") and not origin.startswith("http://127.0.0.1:")]
        dynamic_origins.extend(env_origins)
    
    # Add wildcard for development (be more restrictive in production)
    if os.environ.get("ENVIRONMENT") != "production":
        dynamic_origins.append("*")
    
    return dynamic_origins

def reconfigure_cors(app, client_port):
    """Reconfigure CORS middleware with dynamic origins."""
    # Remove existing CORS middleware
    app.middleware_stack = None
    app.user_middleware = []
    
    # Get dynamic origins
    origins = _update_cors_origins(client_port)
    
    # Add updated CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rebuild middleware stack
    app.build_middleware_stack()

def wait_for_server(host="localhost", port=8000, timeout=60):
    """Wait for the FastAPI server to be ready."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"http://{host}:{port}/api/get-datasets")
            if response.status_code == 200:
                print(f"API server is ready at http://{host}:{port}")
                return True
        except requests.exceptions.ConnectionError:
            pass
        except Exception as e:
            print(f"Checking server status: {e}")
        
        print(f"Waiting for API server to start on port {port}...")
        time.sleep(2)
    
    print(f"Server failed to start within {timeout} seconds on port {port}")
    return False

def start_server_thread(app, host="0.0.0.0", port=None):
    """Start the FastAPI server in a separate thread on an available port."""
    def run_server():
        uvicorn.run(app, host=host, port=port, log_level="info")
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return port

def start_client(port=None):
    """Start the npm client on an available port."""
    if port is None:
        print(f"Found available port for client: {port}")
    
    #lore_sa\webapp
    current_dir = os.path.dirname(os.path.abspath(__file__))
    npm_directory = os.path.join(current_dir, "npm")

    try:
        # Set the PORT environment variable for the client
        env = os.environ.copy()
        env["PORT"] = str(port)
        
        # Capture both stdout and stderr
        process = subprocess.Popen(
            ["npm", "start"], 
            shell=True if sys.platform == "win32" else False,
            env=env,
            cwd=npm_directory,  # Set the working directory
        )
        
        return process, port
    except Exception as e:
        print(f"Failed to start client: {e}")
        return None, None