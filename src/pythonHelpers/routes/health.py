# routes/health.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health")
@router.head("/health")
async def health_check():
    return JSONResponse(content={"status": "ok"})
