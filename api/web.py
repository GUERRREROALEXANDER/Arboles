"""Development CORS and single-page app hosting."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, Response, abort, request, send_from_directory


def register_dev_cors(app: Flask) -> None:
    """Let the Vite dev server call the API directly while Flask runs in debug mode."""

    @app.after_request
    def allow_dev_origin(response: Response) -> Response:
        origin = request.headers.get("Origin")
        if app.debug and origin == app.config["CORS_ORIGIN"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.vary.add("Origin")
        return response


def register_frontend(app: Flask) -> None:
    """Serve the built frontend with a fallback to index.html for client-side routes."""
    dist = Path(app.config["FRONTEND_DIST"])
    if not (dist / "index.html").is_file():
        return

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path: str) -> Response:
        if path == "api" or path.startswith("api/"):
            abort(404)
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")
