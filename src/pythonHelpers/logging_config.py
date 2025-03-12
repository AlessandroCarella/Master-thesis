import os
import sys
import warnings
import logging
from logging.handlers import RotatingFileHandler
import tensorflow as tf

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
    
    # Reduce verbosity of some loggers
    logging.getLogger('numba').setLevel(logging.WARNING)
    logging.getLogger('matplotlib').setLevel(logging.WARNING)
    logging.getLogger('sklearn').setLevel(logging.WARNING)
    logging.getLogger('umap').setLevel(logging.WARNING)
    
    # Suppress TensorFlow and h5py logs
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    logging.getLogger('h5py._conv').setLevel(logging.ERROR)
    
    # Suppress TensorFlow warnings
    tf.get_logger().setLevel('ERROR')
    # Disable TensorFlow deprecation warnings
    tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)
    
    # Suppress h5py warnings
    warnings.filterwarnings('ignore', category=FutureWarning, module='h5py')
    
    # Suppress other common warnings
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow C++ level logs
    
    logging.info(f"Logging configured with level {log_level}") 