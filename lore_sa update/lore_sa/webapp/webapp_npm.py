from typing import Optional, Dict, Tuple
import os
import sys
import subprocess
from pathlib import Path


class NPMClientError(Exception):
    """Exception raised for NPM-related operations errors."""
    pass


def check_npm_installed() -> bool:
    """
    Verify that NPM is installed and accessible.
    
    Returns
    -------
    bool
        True if NPM is available.
        
    Raises
    ------
    NPMClientError
        If NPM is not installed or not accessible.
        
    Notes
    -----
    Checks NPM availability by running version command.
    Provides installation instructions if NPM is missing.
    """
    try:
        result = subprocess.run(
            ["npm", "--version"], 
            capture_output=True, 
            text=True, 
            check=True,
            shell=True if sys.platform == "win32" else False
        )
        print(f"NPM version detected: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        raise NPMClientError(
            """
            \nNPM is not installed or not accessible.
            \nPlease install Node.js and npm from here https://nodejs.org/en/download/ first.
            \nVersions used for development:
                \n\tNPM version: 10.7.0
                \n\tNode.js version: 20.15.1
            """
        ) from e


def get_npm_directory() -> str:
    """
    Get the path to the NPM project directory.
    
    Returns
    -------
    str
        Absolute path to NPM project directory.
        
    Raises
    ------
    NPMClientError
        If NPM directory doesn't exist.
        
    Notes
    -----
    Locates the npm subdirectory relative to current webapp module.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    npm_directory = os.path.join(current_dir, "npm")
    
    if not os.path.exists(npm_directory):
        raise NPMClientError(f"NPM directory not found: {npm_directory}")
    
    return npm_directory


def check_package_json_exists(npm_directory: str) -> str:
    """
    Verify that package.json exists in NPM directory.
    
    Parameters
    ----------
    npm_directory : str
        Path to NPM project directory.
        
    Returns
    -------
    str
        Path to package.json file.
        
    Raises
    ------
    NPMClientError
        If package.json is not found.
    """
    package_json_path = os.path.join(npm_directory, "package.json")
    if not os.path.exists(package_json_path):
        raise NPMClientError(f"package.json not found in {npm_directory}")
    return package_json_path


def check_dependencies_installed(npm_directory: str) -> bool:
    """
    Check if NPM dependencies are already installed.
    
    Parameters
    ----------
    npm_directory : str
        Path to NPM project directory.
        
    Returns
    -------
    bool
        True if node_modules directory exists and is not empty.
    """
    node_modules_path = os.path.join(npm_directory, "node_modules")
    return os.path.exists(node_modules_path) and os.listdir(node_modules_path)


def install_npm_dependencies(npm_directory: str) -> None:
    """
    Install NPM dependencies if not already present.
    
    Parameters
    ----------
    npm_directory : str
        Path to NPM project directory.
        
    Raises
    ------
    NPMClientError
        If dependency installation fails.
        
    Notes
    -----
    Skips installation if dependencies are already present.
    Runs 'npm install' in the specified directory.
    """
    if check_dependencies_installed(npm_directory):
        print("Dependencies already installed, skipping npm install")
        return
    
    print("Installing npm dependencies...")
    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=npm_directory,
            capture_output=True,
            text=True,
            check=True,
            shell=True if sys.platform == "win32" else False
        )
        print("Dependencies installed successfully")
        if result.stdout:
            print(f"NPM install output: {result.stdout}")
    except subprocess.CalledProcessError as e:
        raise NPMClientError(f"Failed to install dependencies: {e.stderr}") from e


def start_npm_process(npm_directory: str, port: int, env_vars: Dict[str, str] = None) -> subprocess.Popen:
    """
    Start NPM development server process.
    
    Parameters
    ----------
    npm_directory : str
        Path to NPM project directory.
    port : int
        Port number for the development server.
    env_vars : Dict[str, str]
        Additional environment variables to set.
        
    Returns
    -------
    subprocess.Popen
        Running NPM process handle.
        
    Raises
    ------
    NPMClientError
        If NPM process fails to start.
    """
    try:
        env = os.environ.copy()
        env["PORT"] = str(port)
        
        if env_vars:
            env.update(env_vars)
        
        process = subprocess.Popen(
            ["npm", "start"],
            shell=True if sys.platform == "win32" else False,
            env=env,
            cwd=npm_directory,
        )
        
        return process
        
    except Exception as e:
        raise NPMClientError(f"Failed to start npm process: {e}") from e


def start_client(port: int = None, auto_install: bool = True, 
                env_vars: Dict[str, str] = None) -> Tuple[subprocess.Popen, int]:
    """
    Start NPM client with dependency management.
    
    Parameters
    ----------
    port : int
        Port number for client server. If None, uses environment default.
    auto_install : bool, default=True
        Whether to automatically install dependencies if missing.
    env_vars : Dict[str, str]
        Additional environment variables for the client process.
        
    Returns
    -------
    Tuple[subprocess.Popen, int]
        Running process handle and port number.
        
    Notes
    -----
    Orchestrates the complete client startup workflow including
    NPM verification, dependency installation, and process launch.
    """
    check_npm_installed()
    
    npm_directory = get_npm_directory()
        
    if auto_install:
        install_npm_dependencies(npm_directory)
    
    process = start_npm_process(npm_directory, port, env_vars)
    
    return process, port
