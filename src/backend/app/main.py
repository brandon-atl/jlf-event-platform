"""JLF ERP — FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db

# Rate limiter instance (shared across routers via app.state)
limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database tables + scheduler. Shutdown: cleanup."""
    from app.tasks.scheduler import start_scheduler, stop_scheduler

    logger.info("Starting JLF ERP backend...")
    await init_db()
    logger.info("Database initialized.")
    try:
        start_scheduler()
        logger.info("Background scheduler started.")
    except Exception:
        logger.exception("Failed to start background scheduler — app will run without scheduled tasks")
    yield
    try:
        stop_scheduler()
    except Exception:
        logger.exception("Error stopping scheduler")
    logger.info("Shutting down JLF ERP backend.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="JLF Event Management ERP",
        description="Event registration, payment, and logistics for Just Love Forest",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        bootstrap,
        co_creators,
        dashboard,
        events,
        notifications,
        portal,
        registration,
        registrations,
        users,
        webhooks,
    )

    app.include_router(bootstrap.router, prefix="/api/v1")
    app.include_router(registration.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(webhooks.router, prefix="/api/v1")
    app.include_router(events.router, prefix="/api/v1")
    app.include_router(registrations.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")
    app.include_router(portal.router, prefix="/api/v1")
    app.include_router(notifications.router, prefix="/api/v1")
    app.include_router(co_creators.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")

    # Health check
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": "jlf-erp"}

    @app.get("/health/deep")
    async def deep_health_check():
        """Check database connectivity. Returns sanitized status only."""
        from sqlalchemy import text

        from app.database import async_session

        checks = {"service": "jlf-erp", "database": "unknown"}
        try:
            async with async_session() as session:
                result = await session.execute(text("SELECT 1"))
                result.scalar()
                checks["database"] = "connected"
        except Exception as e:
            # Log full error server-side, return sanitized status to caller
            logger.error("Deep health check — database error: %s", e)
            checks["database"] = "unavailable"
            return JSONResponse(status_code=503, content=checks)

        checks["status"] = "healthy"
        return checks

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        from time import perf_counter

        start = perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception:
            raise
        finally:
            duration_ms = (perf_counter() - start) * 1000
            # Log slow requests (>2s) and errors
            if duration_ms > 2000 or status_code >= 500:
                logger.warning(
                    "%s %s → %d (%.0fms)",
                    request.method,
                    request.url.path,
                    status_code,
                    duration_ms,
                )

    # Global exception handlers
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unhandled exception on %s %s: %s",
            request.method,
            request.url.path,
            exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()
