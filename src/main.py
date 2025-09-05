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

def launch_demo(width='100%', height=1000, path="", scale=0.7):
    print("🎯 Launching Master Thesis Demo Application")
    print("=" * 50)
    
    # Clean up1 existing processes on target ports
    cleanup_ports([8000, 8080])
    
    # Find available ports
    try:
        api_port = find_available_port(8000)
        client_port = find_available_port(8080)
        print(f"🔍 Found available ports - API: {api_port}, Client: {client_port}")
    except RuntimeError as e:
        print(f"❌ {e}")
        return
    
    # Reconfigure CORS with dynamic ports
    try:
        reconfigure_cors(api_port, client_port)
    except Exception as e:
        print(f"⚠️  Warning: Could not reconfigure CORS: {e}")
    
    # Get host configuration
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"📡 Starting API server on {host}:{api_port}")
    
    # Start server in background thread
    server_thread, actual_api_port = start_server_thread(host, api_port)
    
    # Wait for server to be ready
    if not wait_for_server("localhost", actual_api_port):
        print("❌ Failed to start API server. Exiting...")
        return
    
    # Start client
    client_process, actual_client_port = start_client(client_port)
    if not client_process or actual_client_port is None:
        print("❌ Failed to start client. Exiting...")
        return
    
    # Wait a moment for the client to start
    print("⏳ Waiting for client to start...")
    time.sleep(3)
    
    print("\n" + "=" * 50)
    print("✅ Demo application started successfully!")
    print(f"📡 API: http://localhost:{actual_api_port}")
    print(f"🌐 Client: http://localhost:{actual_client_port}")
    print("💡 If ports were busy, alternative ports were automatically selected")
    print("=" * 50)
    
    # Show the client in the notebook
    show_localhost_content(actual_client_port, width, height, scale)

def setup_custom_explanation_system(dataset_df, classifier, target_column='target'):
    print("🎯 Setting up Custom Dataset Explanation System")
    print("=" * 50)
    
    # Clean up existing processes on target ports first
    cleanup_ports([8000, 8080])
    
    try:
        import pandas as pd
        import numpy as np
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler, OrdinalEncoder
        from sklearn.compose import ColumnTransformer
        from lore_sa.dataset import TabularDataset
        from lore_sa.bbox import sklearn_classifier_bbox
        from pythonHelpers.routes.state import global_state
        
        # Validate inputs
        print("📊 Validating custom dataset...")
        if dataset_df.empty:
            raise ValueError("Dataset is empty")
        if target_column not in dataset_df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")
        if len(dataset_df.columns) < 2:
            raise ValueError("Dataset must have at least 2 columns (features + target)")
            
        print("🤖 Validating custom classifier...")
        required_methods = ['predict', 'predict_proba']
        for method in required_methods:
            if not hasattr(classifier, method):
                raise ValueError(f"Classifier must have '{method}' method")
        
        # Test classifier on sample
        feature_cols = [col for col in dataset_df.columns if col != target_column]
        X_sample = dataset_df[feature_cols].iloc[:1]
        try:
            prediction = classifier.predict(X_sample)
            prob_prediction = classifier.predict_proba(X_sample)
        except Exception as e:
            raise ValueError(f"Classifier validation failed: {str(e)}")
        
        print("🔄 Converting dataset to LORE format...")
        
        # Create data dictionary for TabularDataset
        data_dict = {}
        for col in dataset_df.columns:
            if col != target_column:
                series = dataset_df[col]
                if pd.api.types.is_numeric_dtype(series):
                    print ("numeric", col)
                    print (dataset_df[col].value_counts())
                    data_dict[col] = series.astype(float).values
                else:
                    print ("cat", col)
                    data_dict[col] = series.astype(str).values
            else:
                # Convert target to string labels
                data_dict[target_column] = dataset_df[col].astype(str).values
        
        # Create TabularDataset
        dataset = TabularDataset.from_dict(data_dict, target_column)
        dataset.df.dropna(inplace=True)
        
        print("📦 Setting up classifier bbox...")
        
        # Create preprocessor for the classifier
        numeric_indices = [v['index'] for v in dataset.descriptor['numeric'].values()]
        categorical_indices = [v['index'] for v in dataset.descriptor['categorical'].values()]
        
        preprocessor = ColumnTransformer([
            ('num', StandardScaler(), numeric_indices),
            ('cat', OrdinalEncoder(), categorical_indices)
        ])
        
        # Create pipeline with preprocessor and classifier
        model = make_pipeline(preprocessor, classifier)
        
        # Prepare training data for fitting the preprocessor
        feature_indices = numeric_indices + categorical_indices
        X = dataset.df.iloc[:, feature_indices]
        y = dataset.df[target_column]
        
        # Split for training (we need to fit the preprocessor)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )
        
        # Fit the pipeline (this will fit the preprocessor)
        model.fit(X_train, y_train)
        
        # Create LORE-compatible bbox
        bbox = sklearn_classifier_bbox.sklearnBBox(model)
        
        print("💾 Updating global state...")
        
        # Update global state to match what training normally does
        global_state.bbox = bbox
        global_state.dataset = dataset  
        global_state.X_train = X_train
        global_state.y_train = y_train
        global_state.X_test = X_test
        global_state.y_test = y_test
        global_state.descriptor = dataset.descriptor
        global_state.feature_names = feature_cols
        global_state.target_names = sorted(dataset_df[target_column].unique().tolist())
        global_state.dataset_name = "Custom Dataset"
        
        print("✅ Custom dataset and classifier loaded successfully!")
        print(f"📈 Dataset: {len(dataset_df)} samples, {len(feature_cols)} features")  
        print(f"🏷️  Classes: {global_state.target_names}")
        print(f"📊 Feature types: {len(dataset.descriptor.get('numeric', {}))} numeric, {len(dataset.descriptor.get('categorical', {}))} categorical")
        print("=" * 50)
        print("🌐 Custom data is now loaded!")
        print("👉 Go to localhost:8080 in your browser and refresh the page")
        print("🎯 You should see the feature inputs directly (skipping dataset selection)")
        
    except Exception as e:
        print(f"❌ Error setting up custom explanation system: {str(e)}")
        raise

def launch_demo_with_custom_data(width='100%', height=1000, scale=0.7):
    print("🚀 Launching demo with custom data loaded...")
    
    # Clean up existing processes on target ports first
    cleanup_ports([8000, 8080])
    
    # Start the normal demo but with a flag to indicate custom data is loaded
    os.environ["CUSTOM_DATA_LOADED"] = "true"
    launch_demo(width=width, height=height, scale=scale)
