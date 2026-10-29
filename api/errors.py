from __future__ import annotations

import logging

from flask import Flask, Response, jsonify
from werkzeug.exceptions import BadRequest, HTTPException, NotFound

from canopy.errors import CanopyError, ConflictError, NotFoundError, ValidationError

logger = logging.getLogger(__name__)

_STATUS_BY_ERROR: dict[type[CanopyError], int] = {
    NotFoundError: 404,
    ValidationError: 422,
    ConflictError: 409,
}


def error_response(code: str, message: str, status: int) -> tuple[Response, int]:
    return jsonify({"error": {"code": code, "message": message}}), status


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(CanopyError)
    def handle_domain_error(error: CanopyError) -> tuple[Response, int]:
        return error_response(error.code, error.message, _STATUS_BY_ERROR.get(type(error), 400))

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException) -> tuple[Response, int]:
        if isinstance(error, NotFound):
            return error_response(NotFoundError.code, "resource not found", 404)
        if isinstance(error, BadRequest):
            return error_response(ValidationError.code, error.description or "bad request", 422)
        status = error.code or 500
        return error_response(error.name.lower().replace(" ", "_"), error.description or error.name, status)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception) -> tuple[Response, int]:
        logger.exception("unhandled error", exc_info=error)
        return error_response("internal", "internal server error", 500)
