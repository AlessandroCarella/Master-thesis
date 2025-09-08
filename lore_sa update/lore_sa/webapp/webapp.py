from typing import Optional, List, Any, Union
import os
import webbrowser
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from IPython.display import display, HTML

from .routes.webapp_api_datasetDataInfo import router as dataset_router
from .routes.webapp_api_model import router as model_router
from .routes.webapp_api_explain import router as explain_router
from .routes.webapp_api_colors import router as colors_router
from .webapp_logging_config import configure_logging
from .webapp_portsUtil import (
    reconfigure_cors, wait_for_server, 
    start_server_thread 
)
from .webapp_npm import start_client
from .routes.webapp_api_state import webapp_state


class Webapp:
    """
    Main webapp class for LORE-based machine learning explanations.
    
    Provides web interface for model training, explanation generation,
    and interactive visualization of decision boundaries and local explanations.
    
    Parameters
    ----------
    initial_origins : List[str]
        Initial CORS origins for the FastAPI application.
        If None, uses environment variable or default localhost patterns.
        
    Attributes
    ----------
    app : FastAPI
        FastAPI application instance.
    api_port : int
        Port number for the API server.
    client_port : int
        Port number for the client interface.
    initial_origins : List[str]
        CORS origins configuration.
    """
    
    def __init__(self, initial_origins: List[str] = None) -> None:
        """Initialize webapp with CORS configuration and FastAPI setup."""
        self.app: FastAPI = None
        self.api_port: int = None
        self.client_port: int = None
        self.initial_origins = initial_origins or os.environ.get("ALLOWED_ORIGINS", "http://localhost:*").split(",")
        
        self._setup_app()
    
    def _setup_app(self) -> None:
        """
        Configure FastAPI application with middleware and routers.
        
        Notes
        -----
        Sets up lifespan events, CORS middleware, and includes all API routers.
        """
        async def lifespan(app: FastAPI) -> None:
            configure_logging()
            yield
        
        self.app = FastAPI(lifespan=lifespan)
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.initial_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        self._include_routers()
    
    def _include_routers(self) -> None:
        """Include all API endpoint routers in the FastAPI application."""
        self.app.include_router(dataset_router)
        self.app.include_router(model_router)
        self.app.include_router(explain_router)
        self.app.include_router(colors_router)
    
    def _show_localhost_content(self, port: int = 8080, width: Union[str, int] = '100%', 
                               height: int = 1500, scale: float = 0.7) -> None:
        """
        Display webapp content in Jupyter notebook using iframe.
        
        Parameters
        ----------
        port : int, default=8080
            Port number where the webapp is running.
        width : Union[str, int], default='100%'
            Width of the display container (percentage or pixels).
        height : int, default=1500
            Height of the iframe in pixels.
        scale : float, default=0.7
            Scaling factor for the iframe content.
            
        Notes
        -----
        Creates scaled iframe display suitable for Jupyter notebook integration.
        Handles both percentage and pixel-based width specifications.
        """
        url = f"http://localhost:{port}"
        
        if isinstance(width, str) and width.endswith('%'):
            container_width = width
            iframe_width = f"{int(100 / scale)}%"
        else:
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
    
    def _open_browser_at_localhost(self, port: int = 8080) -> None:
        """
        Open webapp in default web browser.
        
        Parameters
        ----------
        port : int, default=8080
            Port number where the webapp is running.
            
        Returns
        -------
        bool
            True if browser opened successfully, False otherwise.
        """
        url = f'http://localhost:{port}'
        
        try:
            print(f"Opening {url} in your default browser...")
            webbrowser.open(url)
            print("Browser opened successfully!")
        except Exception as e:
            print(f"Error opening browser: {e}")

    def _launch_webapp(self, inJupyter: bool, width: Union[str, int], height: int, 
                      scale: float, title: str) -> None:
        """
        Launch complete webapp with API server and client interface.
        
        Parameters
        ----------
        inJupyter : bool
            Whether to display in Jupyter notebook or open browser.
        width : Union[str, int]
            Display width for Jupyter integration.
        height : int
            Display height for Jupyter integration.
        scale : float
            Scaling factor for Jupyter display.
        title : str
            Title message to display during startup.
            
        Notes
        -----
        Orchestrates complete webapp startup including port allocation,
        CORS configuration, server startup, and client interface launch.
        """
        print(title)
        print("=" * 50)
        
        self.api_port = 8000
        self.client_port = 8080
        
        if self.api_port != 8000 or self.client_port != 8080:
            print(f"Found available ports - API: {self.api_port}, Client: {self.client_port}")
        
        reconfigure_cors(self.app, self.client_port)
        
        host = os.environ.get("HOST", "0.0.0.0")
        
        print(f"Starting API server on {host}:{self.api_port}")
        
        actual_api_port = start_server_thread(self.app, host, self.api_port)
        
        if not wait_for_server("localhost", actual_api_port):
            print("Failed to start API server. Exiting...")
            return
        
        client_process, actual_client_port = start_client(self.client_port)
        if not client_process or actual_client_port is None:
            print("Failed to start client. Exiting...")
            return
        
        self.api_port = actual_api_port
        self.client_port = actual_client_port
        
        print("Application started successfully!")
        print(f"API: http://localhost:{actual_api_port}/docs#/")
        print(f"Client: http://localhost:{actual_client_port}")
        print("=" * 50)
        
        if inJupyter:
            self._show_localhost_content(actual_client_port, width, height, scale)
        else:
            self._open_browser_at_localhost(actual_client_port)

    def launch_demo(self, inJupyter: bool = False, width: Union[str, int] = '100%', 
                   height: int = 1500, scale: float = 0.7, 
                   title: str = "Launching LORE_sa Demo Application") -> None:
        """
        Launch demo webapp with sample datasets and default configuration.
        
        Parameters
        ----------
        inJupyter : bool, default=False
            Whether to display in Jupyter notebook instead of opening browser.
        width : Union[str, int], default='100%'
            Display width for Jupyter notebook integration.
        height : int, default=1500
            Display height in pixels for Jupyter notebook.
        scale : float, default=0.7
            Scaling factor for Jupyter notebook display.
        title : str, default="Launching LORE_sa Demo Application"
            Title message displayed during startup.
            
        Notes
        -----
        Configures webapp for demo mode with built-in datasets.
        Resets webapp state and sets environment flags for demo workflow.
        """
        os.environ["CUSTOM_DATA_LOADED"] = "false"
        os.environ["INSTANCE_PROVIDED"] = "false"

        webapp_state.bbox = None
        webapp_state.dataset = None
        webapp_state.descriptor = None
        webapp_state.feature_names = None
        webapp_state.target_names = None
        webapp_state.dataset_name = None
        webapp_state.provided_instance = None
        
        self._launch_webapp(
            inJupyter=inJupyter,
            width=width, 
            height=height, 
            scale=scale, 
            title=title
        )

    def interactive_explanation(self, bbox: Any, dataset: Any, target_column: str, 
                              encoder: Any, generator: Any, surrogate: Any, 
                              instance: Any = None, inJupyter: bool = True, 
                              width: Union[str, int] = '100%', height: int = 1500, 
                              scale: float = 0.7, 
                              title: str = "Launching LORE_sa explanation viz webapp") -> None:
        """
        Launch interactive explanation interface with custom model and data.
        
        Parameters
        ----------
        bbox : Any
            Black box model wrapper for generating predictions.
        dataset : Any
            Dataset object with descriptor and data information.
        target_column : str
            Name of the target column in the dataset.
        encoder : Any
            Feature encoder/decoder for data transformations.
        generator : Any
            Neighborhood sample generator for local explanations.
        surrogate : Any
            Surrogate model for generating interpretable explanations.
        instance : Any, default=None
            Specific instance to explain (if provided).
        inJupyter : bool, default=True
            Whether to display in Jupyter notebook.
        width : Union[str, int], default='100%'
            Display width for Jupyter integration.
        height : int, default=1500
            Display height for Jupyter integration.
        scale : float, default=0.7
            Scaling factor for Jupyter display.
        title : str, default="Launching LORE_sa explanation viz webapp"
            Startup title message.
            
        Notes
        -----
        Configures webapp for custom explanation workflow with user-provided
        models and data. Updates webapp state with all necessary components
        for explanation generation and visualization.
        """
        os.environ["CUSTOM_DATA_LOADED"] = "true"
        
        if instance is not None:
            os.environ["INSTANCE_PROVIDED"] = "true"
        else:
            os.environ["INSTANCE_PROVIDED"] = "false"

        webapp_state.bbox = bbox
        webapp_state.dataset = dataset
        webapp_state.descriptor = dataset.descriptor
        webapp_state.encoder = encoder
        webapp_state.generator = generator
        webapp_state.surrogate = surrogate
        webapp_state.feature_names = [kk for k, v in dataset.descriptor.items() if k != target_column for kk in v.keys()]
        webapp_state.target_names = sorted(dataset.df[target_column].unique().tolist())
        webapp_state.dataset_name = "Custom Dataset"
        webapp_state.provided_instance = instance
        
        self._launch_webapp(
            inJupyter=inJupyter,
            width=width, 
            height=height, 
            scale=scale, 
            title=title
        )
