from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any

from flask import Flask

from api.container import EXTENSION_KEY, ServiceContainer, utc_now
from api.errors import register_error_handlers
from api.routes import register_blueprints
from api.web import register_dev_cors, register_frontend
from canopy.persistence import JsonRepository

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def create_app(config: Mapping[str, Any] | None = None) -> Flask:
    """Build the Flask application.

    Recognised settings besides Flask's own: DATA_PATH (dataset file),
    FRONTEND_DIST (built SPA folder), CORS_ORIGIN (dev origin allowed in debug)
    and CLOCK (callable returning an aware datetime, for tests).
    """
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        DATA_PATH=PROJECT_ROOT / "data" / "bogota.json",
        FRONTEND_DIST=PROJECT_ROOT / "frontend" / "dist",
        CORS_ORIGIN="http://localhost:5173",
        CLOCK=utc_now,
    )
    if config is not None:
        app.config.update(config)
    app.json.sort_keys = False  # type: ignore[attr-defined]
    app.json.ensure_ascii = False  # type: ignore[attr-defined]

    app.extensions[EXTENSION_KEY] = ServiceContainer(JsonRepository(app.config["DATA_PATH"]), app.config["CLOCK"])
    register_blueprints(app)
    register_error_handlers(app)
    register_dev_cors(app)
    register_frontend(app)
    return app
