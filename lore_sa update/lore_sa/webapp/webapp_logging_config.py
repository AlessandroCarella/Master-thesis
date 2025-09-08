from typing import Optional, List
import os
import sys
import warnings
import logging
from logging.handlers import RotatingFileHandler


def configure_logging(log_level: str = None, log_file: str = None, 
                     clean_log: bool = True) -> None:
    """
    Configure comprehensive logging system for the webapp.
    
    Parameters
    ----------
    log_level : str
        Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        If None, reads from LOG_LEVEL environment variable, defaults to INFO.
    log_file : str
        Path to log file. If None, reads from LOG_FILE environment variable,
        defaults to "app.log".
    clean_log : bool, default=True
        Whether to clear existing log file on startup.
        
    Notes
    -----
    Sets TensorFlow environment variables before any TF imports occur.
    Configures both file and console logging with rotation.
    Suppresses verbose logging from common noisy libraries.
    """
    _set_tensorflow_environment_variables()
    
    if log_level is None:
        log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    
    if log_file is None:
        log_file = os.environ.get("LOG_FILE", "app.log")
    
    _ensure_log_directory_exists(log_file)
    
    if clean_log and os.path.exists(log_file):
        open(log_file, 'w').close()
    
    _configure_root_logger(log_level, log_file)
    _configure_library_loggers()
    _suppress_tensorflow_logging()
    _suppress_warnings()
    
    logging.info(f"Logging configured with level {log_level}")


def _set_tensorflow_environment_variables() -> None:
    """
    Set TensorFlow environment variables before any imports.
    
    Notes
    -----
    Must be called before any TensorFlow modules are imported.
    Reduces TensorFlow verbosity and disables GPU if not needed.
    """
    os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
    os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')
    os.environ.setdefault('CUDA_VISIBLE_DEVICES', '')


def _ensure_log_directory_exists(log_file: str) -> None:
    """
    Create log directory if it doesn't exist.
    
    Parameters
    ----------
    log_file : str
        Path to the log file.
    """
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)


def _configure_root_logger(log_level: str, log_file: str) -> None:
    """
    Configure the root logger with file and console handlers.
    
    Parameters
    ----------
    log_level : str
        Logging level string.
    log_file : str
        Path to log file.
    """
    numeric_level = getattr(logging, log_level, logging.INFO)
    
    handlers = [
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
    ]
    
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers
    )


def _configure_library_loggers() -> None:
    """
    Reduce verbosity of commonly noisy third-party loggers.
    
    Notes
    -----
    Sets WARNING level for libraries that tend to produce excessive
    debugging information that clutters application logs.
    """
    noisy_loggers = [
        'numba', 'matplotlib', 'sklearn', 'umap', 
        'urllib3', 'requests'
    ]
    
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def _suppress_tensorflow_logging() -> None:
    """
    Suppress TensorFlow logging at the Python level.
    
    Notes
    -----
    Only configures TensorFlow logging if TensorFlow is available.
    Gracefully handles cases where TensorFlow is not installed.
    """
    try:
        from tensorflow import get_logger
        from tensorflow import compat
        
        get_logger().setLevel('ERROR')
        compat.v1.logging.set_verbosity(compat.v1.logging.ERROR)
        
        tf_loggers = ['tensorflow', 'h5py._conv']
        for logger_name in tf_loggers:
            logging.getLogger(logger_name).setLevel(logging.ERROR)
        
    except ImportError:
        pass
    except Exception as e:
        logging.warning(f"Could not configure TensorFlow logging: {e}")


def _suppress_warnings() -> None:
    """
    Suppress common warnings that clutter logs.
    
    Notes
    -----
    Filters out FutureWarnings from h5py and UserWarnings from sklearn
    that are typically not actionable for application users.
    """
    warnings.filterwarnings('ignore', category=FutureWarning, module='h5py')
    warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
    