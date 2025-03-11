# routes/health.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import logging
import os
import psutil

router = APIRouter()

@router.get("/health")
@router.head("/health")
async def health_check():
    """
    Basic health check endpoint that returns system information.
    """
    try:
        # Get basic system information
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return JSONResponse(content={
            "status": "ok",
            "system_info": {
                "memory_used_percent": memory.percent,
                "disk_used_percent": disk.percent,
                "cpu_percent": psutil.cpu_percent(interval=0.1),
            },
            "cache_dir_exists": os.path.exists("cache")
        })
    except Exception as e:
        logging.error(f"Error in health check: {str(e)}")
        # Still return 200 OK for health checks, but include error info
        return JSONResponse(content={"status": "warning", "error": str(e)})
