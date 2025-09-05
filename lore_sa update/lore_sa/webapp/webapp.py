# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from IPython.display import display, HTML
import os

from .routes.datasetDataInfo import router as dataset_router
from .routes.model import router as model_router
from .routes.explain import router as explain_router
from .routes.colors import router as colors_router
from .logging_config import configure_logging
from .portsUtil import (
    cleanup_ports, find_available_port, 
    reconfigure_cors, wait_for_server, 
    start_server_thread, start_client 
)
from .routes.state import global_state


class Webapp:

    def __init__(self, initial_origins=None):
        self.app = None
        self.api_port = None
        self.client_port = None
        self.initial_origins = initial_origins or os.environ.get("ALLOWED_ORIGINS", "http://localhost:*").split(",")
        
        self._setup_app()
    
    def _setup_app(self):
        """Set up the FastAPI application with middleware and routers."""
        # Create lifespan handler
        async def lifespan(app: FastAPI):
            # Startup
            configure_logging()
            yield
            # Shutdown (if needed)
        
        # Initialize FastAPI app
        self.app = FastAPI(lifespan=lifespan)
        
        # Add CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.initial_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Include routers from separate modules
        self._include_routers()
    
    def _include_routers(self):
        """Include all the API routers in the FastAPI application."""
        self.app.include_router(dataset_router)
        self.app.include_router(model_router)
        self.app.include_router(explain_router)
        self.app.include_router(colors_router)
    
    def _show_localhost_content(self, port=8080, width='100%', height=1000, scale=0.7):
        """
        Display localhost content in a Jupyter notebook iframe.
        """
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
    
    def launch_demo(self, width='100%', height=1000, scale=0.7, title="Launching LORE_sa Demo Application"):
        print(title)
        print("=" * 50)
        
        # Clean up existing processes on target ports
        cleanup_ports([8000, 8080])
        
        # Find available ports
        self.api_port = find_available_port(8000)
        self.client_port = find_available_port(8080)
        
        if self.api_port != 8000 or self.client_port != 8080:
            print(f"Found available ports - API: {self.api_port}, Client: {self.client_port}")
        
        reconfigure_cors(self.app, self.client_port)
        
        # Get host configuration
        host = os.environ.get("HOST", "0.0.0.0")
        
        print(f"Starting API server on {host}:{self.api_port}")
        
        # Start server in background thread
        actual_api_port = start_server_thread(self.app, host, self.api_port)
        
        # Wait for server to be ready
        if not wait_for_server("localhost", actual_api_port):
            print("Failed to start API server. Exiting...")
            return None, None
        
        # Start client
        client_process, actual_client_port = start_client(self.client_port)
        if not client_process or actual_client_port is None:
            print("Failed to start client. Exiting...")
            return None, None
        
        # Update stored ports with actual values
        self.api_port = actual_api_port
        self.client_port = actual_client_port
        
        print("Application started successfully!")
        print(f"API: http://localhost:{actual_api_port}")
        print(f"Client: http://localhost:{actual_client_port}")
        print("=" * 50)
        
        # Show the client in the notebook
        self._show_localhost_content(actual_client_port, width, height, scale)
        
        return actual_api_port, actual_client_port
    
    def setup_custom_explanation_system(self, bbox, dataset, target_column, width='100%', height=1000, scale=0.7):
        # Set environment flag for custom data
        os.environ["CUSTOM_DATA_LOADED"] = "true"

        # Update global state to match what training normally does
        global_state.bbox = bbox
        global_state.dataset = dataset  
        global_state.descriptor = dataset.descriptor
        global_state.feature_names = [kk for k, v in dataset.descriptor.items() if k != target_column for kk in v.keys()]
        global_state.target_names = sorted(dataset[target_column].unique().tolist())
        global_state.dataset_name = "Custom Dataset"
        
        # Launch the demo with custom title
        return self.launch_demo(
            width=width, 
            height=height, 
            scale=scale, 
            title="Launching LORE_sa explanation viz webapp"
        )
