import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def configure_logging(log_level=None, log_file=None):
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
    """
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
    
    # Reduce verbosity of some loggers
    logging.getLogger('numba').setLevel(logging.WARNING)
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('sklearn').setLevel(logging.WARNING)
    logging.getLogger('umap').setLevel(logging.WARNING)
    
    logging.info(f"Logging configured with level {log_level}") 