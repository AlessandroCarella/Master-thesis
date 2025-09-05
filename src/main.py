# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from IPython.display import display, HTML
import os
import threading
import subprocess
import time
import requests
import sys
import socket
import uvicorn
import psutil
import signal

from pythonHelpers.routes.datasetDataInfo import router as dataset_router
from pythonHelpers.routes.model import router as model_router
from pythonHelpers.routes.explain import router as explain_router
from pythonHelpers.routes.colors import router as colors_router
from pythonHelpers.logging_config import configure_logging

async def lifespan(app: FastAPI):
    # Startup
    configure_logging()
    
    yield
    # Shutdown (if needed)

app = FastAPI(lifespan=lifespan)

# Initial CORS setup - will be updated dynamically in launch_demo
initial_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=initial_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers from separate modules (removed health_router)
app.include_router(dataset_router)
app.include_router(model_router)
app.include_router(explain_router)
app.include_router(colors_router)

def find_processes_using_port(port):
    """Find all processes using a specific port."""
    processes = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.info['connections'] or []:
                    if conn.laddr.port == port:
                        processes.append(proc)
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, AttributeError):
                continue
    except Exception as e:
        print(f"⚠️  Error finding processes on port {port}: {e}")
    return processes

def kill_processes_on_port(port):
    """Kill all processes using a specific port."""
    processes = find_processes_using_port(port)
    
    if not processes:
        print(f"✅ No processes found running on port {port}")
        return True
    
    print(f"🔍 Found {len(processes)} process(es) using port {port}")
    
    killed_count = 0
    for proc in processes:
        try:
            proc_info = f"PID {proc.pid} ({proc.name()})"
            print(f"🔪 Terminating process {proc_info}")
            
            # Try graceful termination first
            proc.terminate()
            
            # Wait up to 3 seconds for graceful termination
            try:
                proc.wait(timeout=3)
                print(f"✅ Successfully terminated {proc_info}")
                killed_count += 1
            except psutil.TimeoutExpired:
                # Force kill if graceful termination fails
                print(f"⚡ Force killing {proc_info}")
                proc.kill()
                proc.wait(timeout=2)
                print(f"✅ Successfully force-killed {proc_info}")
                killed_count += 1
                
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
            print(f"⚠️  Could not terminate process PID {proc.pid}: {e}")
        except Exception as e:
            print(f"❌ Unexpected error terminating process PID {proc.pid}: {e}")
    
    if killed_count > 0:
        print(f"✅ Successfully terminated {killed_count} process(es) on port {port}")
        # Give a moment for the OS to clean up
        time.sleep(1)
    
    return killed_count > 0

def cleanup_ports(ports=[8000, 8080]):
    """Clean up processes running on specified ports."""
    print("🧹 Cleaning up processes on target ports...")
    print("=" * 40)
    
    success = True
    for port in ports:
        try:
            print(f"🔍 Checking port {port}...")
            killed = kill_processes_on_port(port)
            if not killed and find_processes_using_port(port):
                success = False
                print(f"⚠️  Some processes on port {port} could not be terminated")
        except Exception as e:
            print(f"❌ Error cleaning up port {port}: {e}")
            success = False
    
    print("=" * 40)
    if success:
        print("✅ Port cleanup completed successfully")
    else:
        print("⚠️  Port cleanup completed with some warnings")
    
    return success

def find_available_port(start_port=8000, max_attempts=20):
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.bind(('localhost', port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"No available port found in range {start_port}-{start_port + max_attempts - 1}")

def update_cors_origins(api_port, client_port):
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

def reconfigure_cors(api_port, client_port):
    """Reconfigure CORS middleware with dynamic origins."""
    # Remove existing CORS middleware
    app.middleware_stack = None
    app.user_middleware = []
    
    # Get dynamic origins
    origins = update_cors_origins(api_port, client_port)
    
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
    
    print(f"✅ CORS configured for origins: {origins}")

def wait_for_server(host="localhost", port=8000, timeout=60):
    """Wait for the FastAPI server to be ready."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"http://{host}:{port}/api/get-datasets")
            if response.status_code == 200:
                print(f"✅ API server is ready at http://{host}:{port}")
                return True
        except requests.exceptions.ConnectionError:
            pass
        except Exception as e:
            print(f"⚠️  Checking server status: {e}")
        
        print(f"⏳ Waiting for API server to start on port {port}...")
        time.sleep(2)
    
    print(f"❌ Server failed to start within {timeout} seconds on port {port}")
    return False

def start_server_thread(host="0.0.0.0", port=None):
    """Start the FastAPI server in a separate thread on an available port."""
    if port is None:
        port = find_available_port(8000)
        print(f"📡 Found available port for API: {port}")
    
    def run_server():
        uvicorn.run(app, host=host, port=port, log_level="info")
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return server_thread, port

def start_client(port=None):
    """Start the npm client on an available port."""
    if port is None:
        port = find_available_port(8080)
        print(f"🌐 Found available port for client: {port}")
    
    try:
        print(f"🚀 Starting client application on port {port}...")
        
        # Set the PORT environment variable for the client
        env = os.environ.copy()
        env["PORT"] = str(port)
        
        # Try different ways to set the port for different client setups
        process = subprocess.Popen(
            ["npm", "run", "start-client"], 
            shell=True if sys.platform == "win32" else False,
            env=env
        )
        return process, port
    except Exception as e:
        print(f"❌ Failed to start client: {e}")
        return None, None

def show_localhost_content(port=8080, width='100%', height=1000, scale=0.7):
    url = f"http://localhost:{port}"
    
    # Calculate scaled dimensions
    if isinstance(width, str) and width.endswith('%'):
        container_width = width
        iframe_width = f"{int(100 / scale)}%"
    else:
        # Handle pixel values
        width_val = int(width) if isinstance(width, (int, str)) else (1920-80)
        container_width = f"{int(width_val * scale)}px"
        iframe_width = f"{width_val}px"
    
    scaled_height = int(height * scale)
    iframe_height = f"{height}px"
    
    html_content = f"""
    <div style="
        width: {container_width};
        height: {scaled_height}px;
        overflow: hidden;
        border: 1px solid #ccc;
        position: relative;
    ">
        <iframe src="{url}" 
                width="{iframe_width}" 
                height="{iframe_height}"
                style="
                    transform: scale({scale});
                    transform-origin: top left;
                    border: none;
                    position: absolute;
                    top: 0;
                    left: 0;
                "
                frameborder="0"
                scrolling="auto">
        </iframe>
    </div>
    """
    
    display(HTML(html_content))
