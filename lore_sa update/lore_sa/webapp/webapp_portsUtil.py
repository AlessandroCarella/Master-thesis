from typing import List, Optional
import time
import os
import threading
import requests
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def _update_cors_origins(client_port: int) -> List[str]:
    """
    Generate CORS origins list based on client port and environment.
    
    Parameters
    ----------
    client_port : int
        Port number where the client is running.
        
    Returns
    -------
    List[str]
        List of allowed CORS origins for the given client port.
        
    Notes
    -----
    Generates localhost origins for the client port and adds any
    additional origins from environment variables. Includes wildcard
    for development environments.
    """
    dynamic_origins = [
        f"http://localhost:{client_port}",
        f"http://127.0.0.1:{client_port}",
    ]
    
    env_origins_raw = os.environ.get("ALLOWED_ORIGINS", "")
    if env_origins_raw and env_origins_raw != "http://localhost:*":
        env_origins = [origin.strip() for origin in env_origins_raw.split(",") if origin.strip()]
        env_origins = [origin for origin in env_origins if not origin.startswith("http://localhost:") and not origin.startswith("http://127.0.0.1:")]
        dynamic_origins.extend(env_origins)
    
    if os.environ.get("ENVIRONMENT") != "production":
        dynamic_origins.append("*")
    
    return dynamic_origins


def reconfigure_cors(app: FastAPI, client_port: int) -> None:
    """
    Reconfigure CORS middleware with updated client port origins.
    
    Parameters
    ----------
    app : FastAPI
        FastAPI application instance to reconfigure.
    client_port : int
        Client port for CORS origin generation.
        
    Notes
    -----
    Removes existing CORS middleware and adds updated configuration
    with dynamic origins based on the client port. Required when
    client port changes after initial app setup.
    """
    app.middleware_stack = None
    app.user_middleware = []
    
    origins = _update_cors_origins(client_port)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.build_middleware_stack()


def wait_for_server(host: str = "localhost", port: int = 8000, timeout: int = 60) -> bool:
    """
    Wait for API server to become ready and responsive.
    
    Parameters
    ----------
    host : str, default="localhost"
        Hostname where server is expected to run.
    port : int, default=8000
        Port number where server is expected to run.
    timeout : int, default=60
        Maximum time in seconds to wait for server startup.
        
    Returns
    -------
    bool
        True if server becomes ready within timeout, False otherwise.
        
    Notes
    -----
    Polls the server's health endpoint until it responds successfully
    or timeout is reached. Essential for coordinated startup of
    API server and client components.
    """
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


def start_server_thread(app: FastAPI, host: str = "0.0.0.0", port: int = None) -> int:
    """
    Start FastAPI server in a background thread.
    
    Parameters
    ----------
    app : FastAPI
        FastAPI application instance to serve.
    host : str, default="0.0.0.0"
        Host address to bind the server to.
    port : int
        Port number to run server on. If None, uses uvicorn default.
        
    Returns
    -------
    int
        Port number where server was started.
        
    Notes
    -----
    Starts the uvicorn server in a daemon thread to avoid blocking
    the main process. Allows concurrent operation of API server
    and other webapp components.
    """
    def run_server() -> None:
        """Run uvicorn server with specified configuration."""
        uvicorn.run(app, host=host, port=port, log_level="info")
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return port
