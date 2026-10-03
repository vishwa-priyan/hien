import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import settings
from .database import get_db_pool, close_db_pool
from .ml.cnn_service import cnn_service
from .ml.return_rf_service import return_rf_service
from .ml.demand_forecasting_service import demand_service

# Routers
from .auth.router import router as auth_router
from .routers.users import router as users_router
from .routers.hubs import router as hubs_router
from .routers.products import router as products_router
from .routers.returns import router as returns_router
from .routers.assessments import router as assessments_router
from .routers.inspections import router as inspections_router
from .routers.inventory import router as inventory_router
from .routers.forecasts import router as forecasts_router
from .routers.recommendations import router as recommendations_router
from .routers.transfers import router as transfers_router
from .routers.orders import router as orders_router
from .routers.notifications import router as notifications_router
from .routers.audit import router as audit_router
from .routers.config_router import router as config_router
from .routers.analytics import router as analytics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hien.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Pool
    logger.info("Initializing HIEN Backend & ML Services...")
    get_db_pool()

    # Preload ML models once at service startup
    try:
        cnn_service.load_model()
    except Exception as e:
        logger.warning("CNN model preload encountered issue: %s", e)

    try:
        return_rf_service.load_model()
    except Exception as e:
        logger.warning("Random Forest return classifier preload encountered issue: %s", e)

    try:
        demand_service.load_model()
    except Exception as e:
        logger.warning("Demand forecaster preload encountered issue: %s", e)

    logger.info("All HIEN services started successfully.")
    yield

    # Shutdown: Close Pool
    logger.info("Shutting down HIEN services...")
    close_db_pool()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hyperlocal Inventory Exchange Network (HIEN) Full-Stack Backend & ML Inference Engine",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Health endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "HIEN Backend & ML API",
        "version": settings.VERSION,
        "models": {
            "cnn_condition_classifier": cnn_service.model is not None,
            "random_forest_disposition": return_rf_service.pipeline is not None,
            "demand_forecaster": demand_service.model is not None
        }
    }

# Register all Routers under /api
api_routers = [
    auth_router,
    users_router,
    hubs_router,
    products_router,
    returns_router,
    assessments_router,
    inspections_router,
    inventory_router,
    forecasts_router,
    recommendations_router,
    transfers_router,
    orders_router,
    notifications_router,
    audit_router,
    config_router,
    analytics_router,
]

for r in api_routers:
    app.include_router(r, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred", "error": str(exc)}
    )
