"""JLF ERP — FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database tables. Shutdown: cleanup."""
    logger.info("Starting JLF ERP backend...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down JLF ERP backend.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="JLF Event Management ERP",
        description="Event registration, payment, and logistics for Just Love Forest",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    from app.routers import (
        auth,
        dashboard,
        events,
        notifications,
        portal,
        registration,
        webhooks,
    )

    app.include_router(registration.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(webhooks.router, prefix="/api/v1")
    app.include_router(events.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")
    app.include_router(portal.router, prefix="/api/v1")
    app.include_router(notifications.router, prefix="/api/v1")

    # Health check
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "jlf-erp"}

    # Global exception handlers
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()
