import os
import sys
import subprocess
import shutil
from pathlib import Path


class NPMClientError(Exception):
    """Custom exception for NPM client related errors."""
    pass


def check_npm_installed():
    """Check if npm is installed and accessible."""
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

def get_npm_directory():
    """Get the npm directory path relative to the current script."""
    #lore_sa\webapp
    current_dir = os.path.dirname(os.path.abspath(__file__))
    npm_directory = os.path.join(current_dir, "npm")
    
    if not os.path.exists(npm_directory):
        raise NPMClientError(f"NPM directory not found: {npm_directory}")
    
    return npm_directory

def check_package_json_exists(npm_directory):
    """Check if package.json exists in the npm directory."""
    package_json_path = os.path.join(npm_directory, "package.json")
    if not os.path.exists(package_json_path):
        raise NPMClientError(f"package.json not found in {npm_directory}")
    return package_json_path

def check_dependencies_installed(npm_directory):
    """Check if node_modules exists and has content."""
    node_modules_path = os.path.join(npm_directory, "node_modules")
    return os.path.exists(node_modules_path) and os.listdir(node_modules_path)

def install_npm_dependencies(npm_directory):
    """Install npm dependencies if they're not already installed."""
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

def start_npm_process(npm_directory, port, env_vars=None):
    """Start the npm process with the given environment variables."""
    try:
        # Prepare environment variables
        env = os.environ.copy()
        env["PORT"] = str(port)
        
        # Add any additional environment variables
        if env_vars:
            env.update(env_vars)
        
        # Start the npm process
        process = subprocess.Popen(
            ["npm", "start"],
            shell=True if sys.platform == "win32" else False,
            env=env,
            cwd=npm_directory,
        )
        
        return process
        
    except Exception as e:
        raise NPMClientError(f"Failed to start npm process: {e}") from e

def start_client(port=None, auto_install=True, env_vars=None):
    """
    Start the npm client on an available port.
    
    Args:
        port (int, optional): Specific port to use. If None, finds available port.
        auto_install (bool): Whether to automatically install dependencies if needed.
        env_vars (dict, optional): Additional environment variables to pass.
    
    Returns:
        tuple: (process, port) if successful, (None, None) if failed.
    
    Raises:
        NPMClientError: If npm is not installed or other setup issues occur.
    """
    check_npm_installed()
    
    npm_directory = get_npm_directory()
        
    if auto_install:
        install_npm_dependencies(npm_directory)
    
    process = start_npm_process(npm_directory, port, env_vars)
    
    return process, port