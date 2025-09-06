import os
import sys
import warnings
import logging
from logging.handlers import RotatingFileHandler


def configure_logging(log_level=None, log_file=None, clean_log=True):
    """
    Configure application-wide logging.
    
    Parameters:
    -----------
    log_level : str, optional
        Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        Defaults to INFO or value from LOG_LEVEL environment variable
    log_file : str, optional
        Path to log file
        Defaults to 'app.log' or value from LOG_FILE environment variable
    clean_log : bool, optional
        If True, clears the log file before configuring logging
        Defaults to False
    """
    # Set TensorFlow environment variables BEFORE any TF imports
    # This must happen before any TensorFlow modules are imported anywhere
    os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')  # Suppress TF C++ logs
    os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')  # Disable oneDNN optimizations messages
    os.environ.setdefault('CUDA_VISIBLE_DEVICES', '')  # Disable GPU if not needed
    
    # Get log level from environment variable or use default
    if log_level is None:
        log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    
    # Get log file from environment variable or use default
    if log_file is None:
        log_file = os.environ.get("LOG_FILE", "app.log")
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    # Clean log file if requested
    if clean_log and os.path.exists(log_file):
        open(log_file, 'w').close()
    
    # Configure root logger
    numeric_level = getattr(logging, log_level, logging.INFO)
    
    # Create handlers
    handlers = [
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
    ]
    
    # Configure logging
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers
    )
    
    # Reduce verbosity of common noisy loggers
    logging.getLogger('numba').setLevel(logging.WARNING)
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('sklearn').setLevel(logging.WARNING)
    logging.getLogger('umap').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)
    
    # Suppress TensorFlow and related logs - only import if TF is available
    _suppress_tensorflow_logging()
    
    # Suppress h5py warnings
    warnings.filterwarnings('ignore', category=FutureWarning, module='h5py')
    warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
    
    logging.info(f"Logging configured with level {log_level}")


def _suppress_tensorflow_logging():
    """
    Suppress TensorFlow logging - only imports TF if it's available
    """
    try:
        # Only import TF if it's available and set logging appropriately
        from tensorflow import get_logger
        from tensorflow import compat
        
        # Suppress TensorFlow logs at the Python level
        get_logger().setLevel('ERROR')
        
        # Disable TensorFlow deprecation warnings
        compat.v1.logging.set_verbosity(compat.v1.logging.ERROR)
        
        # Set TF loggers to ERROR level
        logging.getLogger('tensorflow').setLevel(logging.ERROR)
        logging.getLogger('h5py._conv').setLevel(logging.ERROR)
        
    except ImportError:
        # TensorFlow not available - skip TF-specific logging configuration
        pass
    except Exception as e:
        # Log any other TF-related issues but don't let them break startup
        logging.warning(f"Could not configure TensorFlow logging: {e}")